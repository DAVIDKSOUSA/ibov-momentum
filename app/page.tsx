import Link from "next/link";
import marketDataset from "@/public/data/ibov-signals.json";
import prophetDataset from "@/public/data/ibov-prophet.json";
import {
  formatDate,
  formatPercent,
  formatPoints,
  getDailyChange,
  getLastCandle,
  getMomentLabel,
  getMomentState,
  type MarketDataset,
} from "@/lib/market";
import type { ProphetDataset } from "@/lib/prophet";

export default function Home() {
  const data = marketDataset as MarketDataset;
  const prophet = prophetDataset as ProphetDataset;
  const last = getLastCandle(data.candles);
  const change = getDailyChange(data.candles);
  const state = getMomentState(data.candles);
  const stateCopy = getMomentLabel(state);
  const prophetLabel =
    prophet.summary.direction === "up"
      ? "Projecao positiva"
      : prophet.summary.direction === "down"
        ? "Projecao negativa"
        : "Projecao lateral";

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-zinc-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-semibold tracking-[0.08em]">
          MOMENTO IBOV
        </Link>
        <nav className="flex gap-2 text-sm font-medium">
          <Link
            href="/app"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 transition hover:border-zinc-500"
          >
            App
          </Link>
          <Link
            href="/app/prophet"
            className="rounded-md bg-zinc-950 px-3 py-2 text-white transition hover:bg-zinc-800"
          >
            Prophet
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Prototipo educacional de mercado
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            Leia o momento do IBOV e compare com uma projecao Prophet.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
            Este MVP mostra candles reais do Ibovespa, sinais por medias moveis
            e uma segunda pagina com forecast Prophet. A ideia e entender a
            arquitetura de um app de trading antes de colocar login, banco,
            assinatura ou um modelo proprietario.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="rounded-md bg-emerald-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Abrir grafico principal
            </Link>
            <Link
              href="/app/prophet"
              className="rounded-md border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 transition hover:border-zinc-500"
            >
              Ver indicador Prophet
            </Link>
          </div>
        </div>

        <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">IBOVESPA</p>
              <p className="mt-1 text-3xl font-semibold">
                {formatPoints(last.close)}
              </p>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {stateCopy.label}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-zinc-500">Ultimo candle</p>
              <p className="mt-1 font-semibold">{formatDate(last.time)}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-zinc-500">Variacao diaria</p>
              <p className="mt-1 font-semibold">{formatPercent(change)}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-zinc-500">Prophet</p>
              <p className="mt-1 font-semibold">{prophetLabel}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-zinc-500">Horizonte</p>
              <p className="mt-1 font-semibold">
                {prophet.config.horizonBusinessDays} pregoes
              </p>
            </div>
          </div>
          <div className="mt-5 h-28 overflow-hidden rounded-md bg-zinc-950 p-3">
            <div className="flex h-full items-end gap-1">
              {data.candles.slice(-34).map((candle) => {
                const height = Math.max(
                  12,
                  Math.min(100, ((candle.close - candle.low) / candle.close) * 900),
                );

                return (
                  <span
                    key={candle.time}
                    className={
                      candle.close >= candle.open
                        ? "w-full bg-emerald-400"
                        : "w-full bg-red-400"
                    }
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Tudo aqui e didatico. O forecast mostra um cenario estatistico, nao
            uma recomendacao financeira.
          </p>
        </aside>
      </section>

      <section
        id="estrutura"
        className="border-y border-zinc-200 bg-white px-5 py-10 sm:px-8"
      >
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            ["1. Dados", "Python baixa candles diarios do IBOV e salva JSON."],
            ["2. Sinais", "Medias moveis classificam o momento atual."],
            [
              "3. Prophet",
              "Outro script treina Prophet no fechamento e projeta os proximos pregoes.",
            ],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-zinc-200 p-5">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-zinc-600 sm:px-8">
        MVP didatico para estudo de produto, dados e interface. Nao use como
        recomendacao financeira.
      </footer>
    </main>
  );
}
