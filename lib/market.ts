export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Signal = {
  time: string;
  type: "bullish" | "bearish";
  price: number;
  label: string;
};

export type MarketDataset = {
  asset: "IBOV";
  source: "yfinance";
  generatedAt: string;
  candles: Candle[];
  signals: Signal[];
};

type MomentState = "bullish" | "bearish" | "neutral";

export function getLastCandle(candles: Candle[]) {
  const last = candles.at(-1);

  if (!last) {
    throw new Error("Dataset sem candles.");
  }

  return last;
}

export function getDailyChange(candles: Candle[]) {
  if (candles.length < 2) {
    return 0;
  }

  const previous = candles.at(-2);
  const current = candles.at(-1);

  if (!previous || !current || previous.close === 0) {
    return 0;
  }

  return (current.close - previous.close) / previous.close;
}

export function getMomentState(candles: Candle[]): MomentState {
  const ma20 = movingAverage(candles, 20);
  const ma50 = movingAverage(candles, 50);
  const last = getLastCandle(candles);

  if (ma20 === null || ma50 === null) {
    return "neutral";
  }

  if (last.close > ma20 && ma20 > ma50) {
    return "bullish";
  }

  if (last.close < ma20 && ma20 < ma50) {
    return "bearish";
  }

  return "neutral";
}

export function getMomentLabel(state: MomentState) {
  if (state === "bullish") {
    return {
      label: "Momento comprador",
      description:
        "O fechamento esta acima da media curta, e a media curta esta acima da media longa.",
      className: "text-emerald-700",
    };
  }

  if (state === "bearish") {
    return {
      label: "Momento vendedor",
      description:
        "O fechamento esta abaixo da media curta, e a media curta esta abaixo da media longa.",
      className: "text-red-700",
    };
  }

  return {
    label: "Neutro",
    description:
      "As medias ainda nao mostram uma direcao clara pela regra atual.",
    className: "text-amber-700",
  };
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function movingAverage(candles: Candle[], period: number) {
  if (candles.length < period) {
    return null;
  }

  const window = candles.slice(-period);
  const total = window.reduce((sum, candle) => sum + candle.close, 0);

  return total / period;
}
