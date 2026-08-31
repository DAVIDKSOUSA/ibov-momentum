"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import ProphetForecastChart, {
  type ProphetChartRange,
} from "@/components/ProphetForecastChart";
import { formatDate, formatPercent, formatPoints } from "@/lib/market";
import {
  configToInput,
  formatMetric,
  getConfidenceLabel,
  getDirectionLabel,
  recommendedProphetConfig,
  sanitizeProphetConfigInput,
  type ProphetConfigInput,
  type ProphetDataset,
} from "@/lib/prophet";

type ProphetWorkspaceProps = {
  initialData: ProphetDataset;
};

const rangeOptions: { label: string; value: ProphetChartRange }[] = [
  { label: "6M", value: "6m" },
  { label: "1A", value: "1y" },
  { label: "2A", value: "2y" },
  { label: "Tudo", value: "all" },
  { label: "Futuro", value: "future" },
];

export default function ProphetWorkspace({ initialData }: ProphetWorkspaceProps) {
  const [data, setData] = useState(initialData);
  const [draftConfig, setDraftConfig] = useState<Required<ProphetConfigInput>>(
    () => configToInput(initialData.config),
  );
  const [range, setRange] = useState<ProphetChartRange>("1y");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appliedConfig = useMemo(() => configToInput(data.config), [data]);
  const hasPendingConfig =
    JSON.stringify(sanitizeProphetConfigInput(draftConfig)) !==
    JSON.stringify(sanitizeProphetConfigInput(appliedConfig));
  const direction = getDirectionLabel(data.summary.direction);

  async function applyConfig() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/prophet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: sanitizeProphetConfigInput(draftConfig),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel recalcular.");
      }

      setData(payload as ProphetDataset);
      setDraftConfig(configToInput((payload as ProphetDataset).config));
      setRange("future");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel recalcular o Prophet.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateConfig<Key extends keyof Required<ProphetConfigInput>>(
    key: Key,
    value: Required<ProphetConfigInput>[Key],
  ) {
    setDraftConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetConfig() {
    setDraftConfig(recommendedProphetConfig);
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-zinc-950">
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
              Indicador Prophet para o IBOV
            </h1>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-sm font-medium sm:flex">
            <Link
              href="/app"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-zinc-900 transition hover:border-zinc-500"
            >
              Momentos
            </Link>
            <Link
              href="/app/prophet"
              className="rounded-md bg-blue-700 px-3 py-2 text-center text-white"
            >
              Prophet
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-200 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Forecast interativo
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Prophet com layout TradingView e aparencia de forecast.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                  O grafico combina o visual classico do Prophet com interacao:
                  arraste para rolar, use o scroll para zoom e ajuste os
                  parametros no painel. Depois clique em Aplicar para rodar o
                  Prophet novamente.
                </p>
              </div>
              <div className="rounded-md bg-blue-50 p-4 text-sm">
                <p className="text-zinc-500">Direcao projetada</p>
                <p className={`mt-1 text-xl font-semibold ${direction.className}`}>
                  {direction.label}
                </p>
                <p className="mt-2 text-zinc-600">
                  {formatPercent(data.summary.projectedChangePct)} ate{" "}
                  {formatDate(data.summary.targetDate)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                <Legend swatchClassName="bg-zinc-900" label="Fechamento real" />
                <Legend swatchClassName="bg-blue-600" label="yhat Prophet" />
                <Legend swatchClassName="bg-blue-100" label="Incerteza" />
                <Legend
                  swatchClassName="border border-zinc-500 bg-white"
                  label="Changepoint"
                />
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-md bg-zinc-100 p-1 text-xs font-semibold sm:flex">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded px-3 py-2 transition ${
                      range === option.value
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-zinc-600 hover:bg-white/70 hover:text-zinc-950"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3">
              <ProphetForecastChart data={data} range={range} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Metric
              label="Ultimo fechamento"
              value={`${formatPoints(data.summary.lastClose)} pts`}
              detail={formatDate(data.summary.lastDate)}
            />
            <Metric
              label="Alvo Prophet"
              value={`${formatPoints(data.summary.targetForecast)} pts`}
              detail={formatDate(data.summary.targetDate)}
            />
            <Metric
              label="Intervalo esperado"
              value={`${formatPoints(data.summary.targetLower)} - ${formatPoints(data.summary.targetUpper)}`}
              detail={getConfidenceLabel(data.summary.confidence)}
            />
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 shadow-sm">
            <h2 className="font-semibold text-zinc-950">
              Como ler este indicador
            </h2>
            <p className="mt-2">
              Prophet nao e um indicador tecnico como RSI ou MACD. Ele ajusta
              uma tendencia com pontos de mudanca, adiciona sazonalidades e
              projeta uma faixa provavel. Para bolsa diaria, a configuracao
              inicial usa horizonte curto, alvo em log, sazonalidade
              multiplicativa, semanal/anual ligadas e diaria desligada.
            </p>
          </section>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Configuracoes Prophet</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Altere, confira o status e clique em Aplicar.
                </p>
              </div>
              <StatusBadge
                isLoading={isLoading}
                hasPendingConfig={hasPendingConfig}
              />
            </div>

            <div className="mt-5 grid gap-5">
              <ControlBlock
                label="Horizonte"
                value={`${draftConfig.horizonBusinessDays} pregoes`}
                detail="Para bolsa, comece curto: 10 a 30 pregoes."
              >
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={draftConfig.horizonBusinessDays}
                  onChange={(event) =>
                    updateConfig(
                      "horizonBusinessDays",
                      Number(event.target.value),
                    )
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <ControlBlock
                label="Flexibilidade da tendencia"
                value={draftConfig.changepointPriorScale.toFixed(3)}
                detail="Maior valor deixa o modelo reagir mais a viradas."
              >
                <input
                  type="range"
                  min="0.001"
                  max="0.3"
                  step="0.001"
                  value={draftConfig.changepointPriorScale}
                  onChange={(event) =>
                    updateConfig(
                      "changepointPriorScale",
                      Number(event.target.value),
                    )
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <ControlBlock
                label="Janela de changepoints"
                value={`${Math.round(draftConfig.changepointRange * 100)}%`}
                detail="Use ate 80%-90% para nao forcar viradas no fim."
              >
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.05"
                  value={draftConfig.changepointRange}
                  onChange={(event) =>
                    updateConfig("changepointRange", Number(event.target.value))
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <ControlBlock
                label="Numero de changepoints"
                value={String(draftConfig.nChangepoints)}
                detail="Mais pontos permitem mais mudancas de inclinacao."
              >
                <input
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={draftConfig.nChangepoints}
                  onChange={(event) =>
                    updateConfig("nChangepoints", Number(event.target.value))
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <ControlBlock
                label="Modo da sazonalidade"
                value={draftConfig.seasonalityMode}
                detail="Multiplicativo costuma combinar melhor com series em nivel."
              >
                <div className="grid grid-cols-2 gap-1 rounded-md bg-zinc-100 p-1 text-sm font-semibold">
                  {(["multiplicative", "additive"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateConfig("seasonalityMode", mode)}
                      className={`rounded px-3 py-2 ${
                        draftConfig.seasonalityMode === mode
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-zinc-600 hover:bg-white/70"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </ControlBlock>

              <ControlBlock
                label="Forca da sazonalidade"
                value={draftConfig.seasonalityPriorScale.toFixed(1)}
                detail="Maior valor deixa a sazonalidade explicar mais variacao."
              >
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={draftConfig.seasonalityPriorScale}
                  onChange={(event) =>
                    updateConfig(
                      "seasonalityPriorScale",
                      Number(event.target.value),
                    )
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <ControlBlock
                label="Intervalo de incerteza"
                value={`${Math.round(draftConfig.intervalWidth * 100)}%`}
                detail="No Prophet precisa ficar entre 50% e 95%."
              >
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={draftConfig.intervalWidth}
                  onChange={(event) =>
                    updateConfig("intervalWidth", Number(event.target.value))
                  }
                  className="w-full accent-blue-700"
                />
              </ControlBlock>

              <div className="grid gap-3 rounded-md border border-zinc-200 p-3">
                <Toggle
                  label="Usar fechamento em log"
                  checked={draftConfig.target === "log_close"}
                  onChange={(checked) =>
                    updateConfig("target", checked ? "log_close" : "close")
                  }
                />
                <Toggle
                  label="Sazonalidade semanal"
                  checked={draftConfig.weeklySeasonality}
                  onChange={(checked) =>
                    updateConfig("weeklySeasonality", checked)
                  }
                />
                <Toggle
                  label="Sazonalidade anual"
                  checked={draftConfig.yearlySeasonality}
                  onChange={(checked) =>
                    updateConfig("yearlySeasonality", checked)
                  }
                />
                <Toggle
                  label="Sazonalidade diaria"
                  checked={draftConfig.dailySeasonality}
                  onChange={(checked) =>
                    updateConfig("dailySeasonality", checked)
                  }
                />
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetConfig}
                  disabled={isLoading}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Recomendada
                </button>
                <button
                  type="button"
                  onClick={applyConfig}
                  disabled={isLoading}
                  className="rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Rodando..." : "Aplicar"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Validacao didatica</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Metric
                label="MAPE"
                value={formatMetric(data.metrics.validationMape, "percent")}
                detail={`${data.config.validationWindow} ultimos pregoes`}
              />
              <Metric
                label="RMSE"
                value={formatMetric(data.metrics.validationRmse, "points")}
                detail="Erro medio em pontos do indice"
              />
              <Metric
                label="Gerado em"
                value={formatDate(data.generatedAt.slice(0, 10))}
                detail="Dados diarios historicos, nao tempo real"
              />
            </div>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Os sinais e forecasts sao educacionais e nao sao recomendacao de
            investimento.
          </section>
        </aside>
      </div>
    </main>
  );
}

function Legend({
  swatchClassName,
  label,
}: {
  swatchClassName: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-8 rounded-sm ${swatchClassName}`} />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function ControlBlock({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-zinc-950">
            {label}
          </span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            {detail}
          </span>
        </span>
        <span className="shrink-0 rounded bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-700">
          {value}
        </span>
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-blue-700"
      />
    </label>
  );
}

function StatusBadge({
  isLoading,
  hasPendingConfig,
}: {
  isLoading: boolean;
  hasPendingConfig: boolean;
}) {
  if (isLoading) {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        Rodando
      </span>
    );
  }

  if (hasPendingConfig) {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Nao aplicado
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      Aplicado
    </span>
  );
}
