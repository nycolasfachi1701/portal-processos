# Contexto — Portal de Processos do Suporte Atua

## O que é este projeto

`index.html` é uma landing page estática (HTML/CSS/JS puro, sem build, sem framework) que funciona como portal interno do setor de Suporte da Atua (empresa TMS, ecossistema NSTECH). Reúne organograma, fluxo de atendimento, catálogo de processos, procedimentos, documentos, base de conhecimento, indicadores e FAQ.

Identidade visual segue o manual de marca da Atua: laranja neon (`#FF3D03`), chumbo (`#424449`), preto, cinza (`#C5CAD2`) e azul escuro (`#000032`). Tipografia: Archivo Black (display), Archivo (corpo), JetBrains Mono (dados/labels).

## Seção relevante: Indicadores (`id="indicadores"`)

Dentro dessa seção tem um gráfico de **"Volume de tickets por hora"**, renderizado em **SVG puro via JavaScript** (sem Chart.js, sem D3, sem lib nenhuma — só `document.createElementNS`). O código do gráfico está no `<script>` perto do final do `<body>`, dentro de uma IIFE comentada `// Gráfico de Tickets por Hora`.

### Onde ficam os dados

Os dados do gráfico estão embutidos diretamente no HTML, num bloco assim:

```html
<script id="ticketsHourData" type="application/json">[["Qua 17/06 00h", 0], ["Qua 17/06 01h", 0], ...]</script>
```

Formato: array de pares `[label, valor]`.
- `label`: string no formato `"{Dia abreviado} {dd}/{mm} {HH}h"` — ex: `"Qui 18/06 09h"`. Dias abreviados em português: Seg, Ter, Qua, Qui, Sex, Sáb, Dom.
- `valor`: inteiro, quantidade de tickets naquela hora.

O JS lê esse JSON, calcula um `viewBox` de 1180x260, desenha grade, zona de pico (linha tracejada vermelha em ≥40 tickets/h), área com gradiente, linha, e adiciona hit-areas invisíveis por ponto para o tooltip ao passar o mouse.

## Origem dos dados: export semanal do Grafana

Os dados vêm de um painel do Grafana interno da Atua, chamado **"Qtd. Tickets por Hora"**, acessado em `http://192.168.0.7:3000` (rede interna, exige VPN — por isso optamos por dados estáticos exportados em vez de embed/iframe ao vivo).

**Toda semana**, alguém do time exporta esse painel como CSV (botão de export do próprio Grafana) e o processo de atualização é:

1. Abrir o CSV exportado. Formato real observado:
   - Tem BOM UTF-8 no início (`\ufeff`)
   - Separador: vírgula
   - Header: `"Qtd. Tickets","Qtd. Tickets"` (duplicado, ignorar)
   - Linhas: `timestamp,valor` — ex: `2026-06-21 05:00:00,0`
   - **As linhas não vêm ordenadas cronologicamente no arquivo** — é necessário ordenar por timestamp antes de usar
2. Converter cada timestamp para o formato de label em português descrito acima
3. Gerar o array `[[label, valor], ...]` ordenado cronologicamente
4. Substituir o conteúdo do `<script id="ticketsHourData" type="application/json">` por esse novo array
5. **Validação obrigatória antes de finalizar**: confirmar que o número de pontos do array gerado é igual ao número de linhas válidas do CSV, e que pelo menos uma amostra de valores (ex: primeiro, último, e um do meio) bate exatamente com o CSV original. Não confiar em transcrição manual — gerar o array programaticamente a partir do CSV (ex: script Python/Node), nunca digitar valores à mão.

## Outras seções com dados "manuais" (não vêm de CSV, mas merecem atenção se forem automatizados depois)

Os cards estáticos na mesma seção de Indicadores (SLA geral, Tempo médio 1ª resposta, CSAT, Tickets/analista/dia, Resolvidos em N1) também são atualizados manualmente, sem CSV — são só texto direto no HTML (`<div class="ind-cell">...`). Se algum dia vierem do Grafana também, seguem a mesma lógica de "snapshot semanal colado no HTML", não embed ao vivo.

## O que NÃO fazer

- Não tentar reativar o iframe do Grafana (`d-solo`) como fonte de dados ao vivo — já testamos, não funciona para quem está fora da VPN, que é a maioria dos usuários do portal.
- Não usar gráfico de "volumetria de tickets fechados" — foi descartado a favor do gráfico de "tickets por hora".
- Não trocar a lib de gráfico por Chart.js/D3/etc sem necessidade — o SVG manual já funciona, é leve e não tem dependência externa.