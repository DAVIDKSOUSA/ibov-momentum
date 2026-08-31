import Link from "next/link";
import TradingChart from "@/components/TradingChart";
import marketDataset from "@/public/data/ibov-signals.json";
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

export default function TradingAppPage() {
  const data = marketDataset as MarketDataset;
  const last = getLastCandle(data.candles);
  const change = getDailyChange(data.candles);
  const state = getMomentState(data.candles);
  const stateCopy = getMomentLabel(state);
  const recentSignals = data.signals.slice(-6).reverse();

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500"
            >
              Momento IBOV
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">
              Painel de sinais educacionais
            </h1>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-sm font-medium sm:flex">
            <Link
              href="/app"
              className="rounded-md bg-zinc-950 px-3 py-2 text-center text-white"
            >
              Momentos
            </Link>
            <Link
              href="/app/prophet"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-zinc-900 transition hover:border-zinc-500"
            >
              Prophet
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">IBOVESPA</p>
              <p className="text-xl font-semibold">
                {formatPoints(last.close)} pontos
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="rounded-md bg-zinc-100 px-3 py-2 font-medium">
                {formatDate(last.time)}
              </span>
              <span
                className={
                  change >= 0
                    ? "rounded-md bg-emerald-50 px-3 py-2 font-semibold text-emerald-800"
                    : "rounded-md bg-red-50 px-3 py-2 font-semibold text-red-800"
                }
              >
                {formatPercent(change)}
              </span>
            </div>
          </div>
          <TradingChart data={data} />
        </section>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Status atual</p>
            <div className="mt-3 rounded-md border border-zinc-200 p-4">
              <p className={`text-2xl font-semibold ${stateCopy.className}`}>
                {stateCopy.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {stateCopy.description}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Regra: compara fechamento, media de 20 periodos e media de 50
              periodos para classificar o momento.
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Ultimos sinais</h2>
            <div className="mt-3 space-y-2">
              {recentSignals.map((signal) => (
                <div
                  key={`${signal.time}-${signal.type}`}
                  className="rounded-md border border-zinc-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={
                        signal.type === "bullish"
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-red-700"
                      }
                    >
                      {signal.label}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {formatDate(signal.time)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    Preco: {formatPoints(signal.price)} pontos
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Produto didatico. Os sinais sao uma demonstracao tecnica, nao uma
            recomendacao de compra ou venda.
          </section>
        </aside>
      </div>
    </main>
  );
}
