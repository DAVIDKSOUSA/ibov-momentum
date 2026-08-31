"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { MarketDataset } from "@/lib/market";

type TradingChartProps = {
  data: MarketDataset;
};

export default function TradingChart({ data }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || data.candles.length === 0) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 520,
      layout: {
        background: { type: ColorType.Solid, color: "hsl(0, 0%, 100%)" },
        textColor: "#000000",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.14)" },
        horzLines: { color: "rgba(148, 163, 184, 0.14)" },
      },
      localization: {
        locale: "pt-BR",
        priceFormatter: (price: number) =>
          new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 0,
          }).format(price),
      },
      rightPriceScale: {
        borderColor: "rgba(212, 212, 216, 0.20)",
      },
      timeScale: {
        borderColor: "rgba(212, 212, 216, 0.20)",
        timeVisible: true,
      },
      crosshair: {
        mode: 0,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
      priceFormat: {
        type: "price",
        precision: 0,
        minMove: 1,
      },
    });

    const candles: CandlestickData<Time>[] = data.candles.map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const markers: SeriesMarker<Time>[] = data.signals.map((signal) => ({
      time: signal.time,
      position: signal.type === "bullish" ? "belowBar" : "aboveBar",
      shape: signal.type === "bullish" ? "arrowUp" : "arrowDown",
      color: signal.type === "bullish" ? "#10b981" : "#ef4444",
      text: signal.label,
    }));

    candleSeries.setData(candles);
    createSeriesMarkers(candleSeries, markers);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full min-w-0 overflow-hidden rounded-md bg-zinc-900 sm:h-[520px] lg:h-[620px]"
      aria-label="Grafico de candles do Ibovespa com sinais de momento"
    />
  );
}
