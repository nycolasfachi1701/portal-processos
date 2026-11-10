# Coletor — Status das Integrações

Lê os 5 contadores da tela interna (`adm.atua.com.br`) e publica um JSON pequeno
num **Gist**, que o portal (externo) lê para mostrar os tiles.

```
[adm.atua.com.br] → [este coletor, na rede interna] → [Gist] → [portal lê e exibe]
```

## 1. Criar o Gist
1. Acesse https://gist.github.com → novo Gist.
2. Nome do arquivo: `status-integracoes.json`; conteúdo inicial: `{}`.
3. Crie como **Secret gist** e copie o **ID** da URL (`gist.github.com/<user>/<ID>`).
4. A URL que o portal vai ler é a **raw**:
   `https://gist.githubusercontent.com/<user>/<ID>/raw/status-integracoes.json`

## 2. Criar o token
- GitHub → Settings → Developer settings → **Tokens (classic)** → generate.
- Escopo mínimo: **`gist`**. Copie o token.

## 3. Rodar
Precisa de **Node 18+** e de rodar numa máquina/servidor que **alcance** o `adm.atua.com.br`.

```bash
# Linux/macOS
STATUS_URL="https://adm.atua.com.br/adm/con_status_integracao.php" \
GH_TOKEN="ghp_xxx" \
GIST_ID="xxxxxxxxxxxx" \
node coletor-status.js
```

```powershell
# Windows PowerShell
$env:GH_TOKEN="ghp_xxx"; $env:GIST_ID="xxxxxxxxxxxx"; node coletor-status.js
```

> Se a tela exigir login (cookie de sessão), defina também `ADM_COOKIE` com o
> cookie copiado do navegador. Se for liberada por rede/IP, não precisa.

## 4. Agendar (a cada 5–10 min)
**Linux (cron):**
```
*/10 * * * * cd /caminho/coletor && GH_TOKEN=... GIST_ID=... /usr/bin/node coletor-status.js >> coletor.log 2>&1
```

**Windows (Agendador de Tarefas):** criar tarefa que executa
`node C:\...\coletor\coletor-status.js` a cada 10 min, com as variáveis de
ambiente definidas no sistema (ou num `.bat` que as exporta antes de chamar o node).

## 5. Ligar no portal
No `index.html`, preencha a constante `FONTE_STATUS_INTEGRACOES` com a URL **raw**
do Gist (passo 1.4). O card "Status das Integrações" aparece sozinho quando o
JSON é lido com sucesso.

---

## Rodar em servidor 24/7 (recomendado)

Pré-requisitos: **Node 18+**, o servidor precisa **alcançar o `adm.atua.com.br`**
(rede interna) e um **token com escopo `gist`**.

### Linux — systemd (robusto e seguro)
1. Copie `coletor-status.js` para `/opt/coletor/` (ou `git clone` do repo).
2. Crie `/opt/coletor/coletor.env` e proteja: `chmod 600 /opt/coletor/coletor.env`
   ```
   STATUS_URL=https://adm.atua.com.br/adm/con_status_integracao.php
   GH_TOKEN=ghp_xxx
   GIST_ID=e98a8cbebd6c5e75e3b6cb3c1bbe1df5
   ```
3. `/etc/systemd/system/coletor-status.service`
   ```ini
   [Unit]
   Description=Coletor Status Integracoes
   [Service]
   Type=oneshot
   EnvironmentFile=/opt/coletor/coletor.env
   ExecStart=/usr/bin/node /opt/coletor/coletor-status.js
   ```
4. `/etc/systemd/system/coletor-status.timer`
   ```ini
   [Unit]
   Description=Roda o coletor a cada 10 min
   [Timer]
   OnBootSec=2min
   OnUnitActiveSec=10min
   Persistent=true
   [Install]
   WantedBy=timers.target
   ```
5. Ativar e testar:
   ```
   sudo systemctl daemon-reload
   sudo systemctl enable --now coletor-status.timer
   sudo systemctl start coletor-status.service   # roda uma vez
   journalctl -u coletor-status -n 20            # deve mostrar "OK — Gist ... atualizado"
   ```

Alternativa simples (cron), com o env protegido:
```
*/10 * * * * set -a; . /opt/coletor/coletor.env; set +a; /usr/bin/node /opt/coletor/coletor-status.js >> /var/log/coletor.log 2>&1
```

### Windows Server — Agendador de Tarefas
Mesmo `executar.bat`, mas na tarefa marque **"Executar estando o usuário conectado ou não"**
(com uma conta de serviço) para rodar 24/7. Defina as variáveis no nível do sistema
ou mantenha-as no `.bat` (com a pasta protegida).

> Segurança: nunca versione o token. Em servidor, prefira `EnvironmentFile`/variável
> de ambiente com permissão restrita (chmod 600) em vez de deixá-lo em arquivo aberto.
