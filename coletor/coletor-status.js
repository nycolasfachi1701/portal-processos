#!/usr/bin/env node
/*
 * Coletor de Status das Integrações
 * ---------------------------------
 * Roda DENTRO da rede (que alcança o adm.atua.com.br), lê os 5 contadores de
 * status + horário e publica um JSON pequeno num Gist. O portal (externo) lê
 * esse Gist e mostra os tiles.
 *
 * Requer Node 18+ (usa fetch nativo). Sem dependências.
 *
 * Variáveis de ambiente:
 *   STATUS_URL  URL da tela (default abaixo)
 *   GH_TOKEN    token do GitHub com escopo "gist"
 *   GIST_ID     id do Gist a atualizar
 *   GIST_FILE   nome do arquivo no Gist (default: status-integracoes.json)
 *   ADM_COOKIE  (opcional) cookie de sessão, caso o adm exija login
 */

const STATUS_URL = process.env.STATUS_URL || 'https://adm.atua.com.br/adm/con_status_integracao.php';
const GH_TOKEN = process.env.GH_TOKEN;
const GIST_ID = process.env.GIST_ID;
const GIST_FILE = process.env.GIST_FILE || 'status-integracoes.json';
const ADM_COOKIE = process.env.ADM_COOKIE || '';

const MAPA = { '5': 'parada', '4': 'bloqueada', '3': 'instavel', '2': 'atencao', '1': 'semFalhas' };

async function coletar() {
  const headers = { 'User-Agent': 'coletor-status-integracoes' };
  if (ADM_COOKIE) headers['Cookie'] = ADM_COOKIE;

  const res = await fetch(STATUS_URL, { headers });
  if (!res.ok) throw new Error(`Falha ao buscar a tela: HTTP ${res.status}`);
  const html = await res.text();

  // Contadores: <span class="si-cartao-valor" data-contador="N">VALOR</span>
  const counts = { parada: null, bloqueada: null, instavel: null, atencao: null, semFalhas: null };
  const re = /data-contador=['"](\d)['"]\s*>\s*(\d+)\s*<\/span>/g;
  let m, achou = 0;
  while ((m = re.exec(html)) !== null) {
    const chave = MAPA[m[1]];
    if (chave) { counts[chave] = Number(m[2]); achou++; }
  }
  if (achou < 5) throw new Error(`Esperava 5 contadores, achei ${achou} — o HTML da tela pode ter mudado.`);

  const horaAdm = (html.match(/Atualizado às\s*([\d:]+)/) || [])[1] || null;
  const total = (html.match(/(\d+)\s*integra[çc][õo]es/) || [])[1];

  return {
    ...counts,
    total: total ? Number(total) : (counts.parada + counts.bloqueada + counts.instavel + counts.atencao + counts.semFalhas),
    atualizadoEm: horaAdm,              // horário mostrado na tela (HH:MM:SS)
    coletadoEm: new Date().toISOString(), // quando o coletor rodou
    fonte: STATUS_URL,
  };
}

async function publicarNoGist(payload) {
  if (!GH_TOKEN || !GIST_ID) {
    console.log('GH_TOKEN/GIST_ID não definidos — pulando publicação. JSON gerado:\n', JSON.stringify(payload, null, 2));
    return;
  }
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'coletor-status-integracoes',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(payload, null, 2) } } }),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar o Gist: HTTP ${res.status} ${await res.text()}`);
  console.log(`OK — Gist ${GIST_ID} atualizado (${GIST_FILE}).`);
}

(async () => {
  try {
    const payload = await coletar();
    console.log('Coletado:', payload);
    await publicarNoGist(payload);
  } catch (e) {
    console.error('ERRO:', e.message);
    process.exit(1);
  }
})();
