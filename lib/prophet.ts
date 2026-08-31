import { formatPercent, formatPoints } from "@/lib/market";

export type ProphetHistoryPoint = {
  time: string;
  close: number;
};

export type ProphetForecastPoint = {
  time: string;
  yhat: number;
  yhatLower: number;
  yhatUpper: number;
  isFuture: boolean;
};

export type ProphetChangepoint = {
  time: string;
  strength: number;
  direction: "increase" | "decrease";
};

export type ProphetDataset = {
  asset: "IBOV";
  source: "yfinance";
  model: "prophet";
  generatedAt: string;
  config: {
    target: "log_close" | "close";
    horizonBusinessDays: number;
    frequency: "B";
    growth: "linear";
    nChangepoints: number;
    changepointRange: number;
    changepointPriorScale: number;
    seasonalityMode: "additive" | "multiplicative";
    seasonalityPriorScale: number;
    weeklySeasonality: boolean;
    yearlySeasonality: boolean;
    dailySeasonality: boolean;
    intervalWidth: number;
    validationWindow: number;
  };
  summary: {
    lastDate: string;
    lastClose: number;
    targetDate: string;
    targetForecast: number;
    targetLower: number;
    targetUpper: number;
    projectedChangePct: number;
    direction: "up" | "down" | "sideways";
    confidence: "higher" | "lower" | "mixed";
  };
  metrics: {
    validationMape: number | null;
    validationRmse: number | null;
  };
  history: ProphetHistoryPoint[];
  forecast: ProphetForecastPoint[];
  changepoints: ProphetChangepoint[];
};

export type ProphetConfig = ProphetDataset["config"];

export type ProphetConfigInput = Partial<{
  target: "log_close" | "close";
  horizonBusinessDays: number;
  changepointPriorScale: number;
  changepointRange: number;
  nChangepoints: number;
  seasonalityMode: "additive" | "multiplicative";
  seasonalityPriorScale: number;
  weeklySeasonality: boolean;
  yearlySeasonality: boolean;
  dailySeasonality: boolean;
  intervalWidth: number;
  validationWindow: number;
}>;

export const recommendedProphetConfig: Required<ProphetConfigInput> = {
  target: "log_close",
  horizonBusinessDays: 20,
  changepointPriorScale: 0.03,
  changepointRange: 0.8,
  nChangepoints: 10,
  seasonalityMode: "multiplicative",
  seasonalityPriorScale: 1,
  weeklySeasonality: true,
  yearlySeasonality: true,
  dailySeasonality: false,
  intervalWidth: 0.95,
  validationWindow: 60,
};

export function configToInput(config: ProphetConfig): Required<ProphetConfigInput> {
  return {
    target: config.target,
    horizonBusinessDays: config.horizonBusinessDays,
    changepointPriorScale: config.changepointPriorScale,
    changepointRange: config.changepointRange,
    nChangepoints: config.nChangepoints,
    seasonalityMode: config.seasonalityMode,
    seasonalityPriorScale: config.seasonalityPriorScale,
    weeklySeasonality: config.weeklySeasonality,
    yearlySeasonality: config.yearlySeasonality,
    dailySeasonality: config.dailySeasonality,
    intervalWidth: config.intervalWidth,
    validationWindow: config.validationWindow,
  };
}

export function sanitizeProphetConfigInput(
  input: unknown,
): Required<ProphetConfigInput> {
  const source = isRecord(input) ? input : {};

  return {
    target: source.target === "close" ? "close" : "log_close",
    horizonBusinessDays: clampNumber(
      source.horizonBusinessDays,
      recommendedProphetConfig.horizonBusinessDays,
      5,
      60,
    ),
    changepointPriorScale: clampNumber(
      source.changepointPriorScale,
      recommendedProphetConfig.changepointPriorScale,
      0.001,
      0.3,
    ),
    changepointRange: clampNumber(
      source.changepointRange,
      recommendedProphetConfig.changepointRange,
      0.6,
      0.95,
    ),
    nChangepoints: clampNumber(
      source.nChangepoints,
      recommendedProphetConfig.nChangepoints,
      5,
      80,
    ),
    seasonalityMode:
      source.seasonalityMode === "additive" ? "additive" : "multiplicative",
    seasonalityPriorScale: clampNumber(
      source.seasonalityPriorScale,
      recommendedProphetConfig.seasonalityPriorScale,
      0.1,
      20,
    ),
    weeklySeasonality:
      typeof source.weeklySeasonality === "boolean"
        ? source.weeklySeasonality
        : recommendedProphetConfig.weeklySeasonality,
    yearlySeasonality:
      typeof source.yearlySeasonality === "boolean"
        ? source.yearlySeasonality
        : recommendedProphetConfig.yearlySeasonality,
    dailySeasonality:
      typeof source.dailySeasonality === "boolean"
        ? source.dailySeasonality
        : recommendedProphetConfig.dailySeasonality,
    intervalWidth: clampNumber(
      source.intervalWidth,
      recommendedProphetConfig.intervalWidth,
      0.5,
      0.95,
    ),
    validationWindow: clampNumber(
      source.validationWindow,
      recommendedProphetConfig.validationWindow,
      20,
      120,
    ),
  };
}

export function getDirectionLabel(direction: ProphetDataset["summary"]["direction"]) {
  if (direction === "up") {
    return {
      label: "Tendencia projetada para cima",
      className: "text-emerald-700",
    };
  }

  if (direction === "down") {
    return {
      label: "Tendencia projetada para baixo",
      className: "text-red-700",
    };
  }

  return {
    label: "Projecao lateral",
    className: "text-amber-700",
  };
}

export function getConfidenceLabel(
  confidence: ProphetDataset["summary"]["confidence"],
) {
  if (confidence === "higher") {
    return "Intervalo inteiro acima do fechamento atual";
  }

  if (confidence === "lower") {
    return "Intervalo inteiro abaixo do fechamento atual";
  }

  return "Intervalo cruza o fechamento atual";
}

export function formatMetric(value: number | null, type: "percent" | "points") {
  if (value === null) {
    return "Indisponivel";
  }

  return type === "percent" ? formatPercent(value) : formatPoints(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}
