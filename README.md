# Momento IBOV

MVP didatico de um app de trading feito com Next.js, TypeScript, Tailwind,
Python, yfinance e Prophet.

## Telas

- `/`: landing page explicando a ideia do produto.
- `/app`: grafico de candles do IBOV com sinais por medias moveis.
- `/app/prophet`: forecast Prophet interativo do fechamento do IBOV.

## Como os dados entram

Os scripts Python geram arquivos JSON dentro de `public/data`:

```txt
public/data/ibov-signals.json
public/data/ibov-prophet.json
```

O Next.js importa esses JSONs para abrir as telas. Na pagina `/app/prophet`,
o botao `Aplicar` tambem chama uma rota local do Next.js que executa Python
novamente e devolve um novo forecast para o grafico.

## Scripts

```bash
npm run fetch:data
npm run fetch:prophet
npm run fetch:all
npm run dev
```

## Configuracao Prophet usada

O forecast recomendado usa fechamento diario do IBOV em escala de log,
horizonte de 20 pregoes, frequencia de dias uteis, tendencia linear com
changepoints, sazonalidade multiplicativa, sazonalidade semanal/anual e sem
sazonalidade diaria.

Essa configuracao e adequada para estudo inicial de bolsa diaria porque evita
tratar cada oscilacao diaria como tendencia estrutural e limita o forecast a um
horizonte curto.

Na interface, os controles mais importantes sao:

- `changepoint_prior_scale`: aumenta ou reduz a sensibilidade da tendencia.
- `changepoint_range`: define em que parte do historico o Prophet pode procurar
  mudancas de tendencia.
- `n_changepoints`: limita quantos pontos candidatos de mudanca serao testados.
- `seasonality_mode`: use `multiplicative` como ponto de partida para indice de
  bolsa.
- `interval_width`: controla a largura da faixa de incerteza.

## Aviso

Este projeto e educacional. Os sinais e forecasts nao sao recomendacao de
investimento.
