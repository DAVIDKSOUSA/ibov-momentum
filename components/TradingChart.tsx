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
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#18181b",
      },
      grid: {
        vertLines: { color: "#e4e4e7" },
        horzLines: { color: "#e4e4e7" },
      },
      localization: {
        locale: "pt-BR",
        priceFormatter: (price: number) =>
          new Intl.NumberFormat("pt-BR", {
            maximumFractionDigits: 0,
          }).format(price),
      },
      rightPriceScale: {
        borderColor: "#d4d4d8",
      },
      timeScale: {
        borderColor: "#d4d4d8",
        timeVisible: true,
      },
      crosshair: {
        mode: 0,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#059669",
      downColor: "#dc2626",
      borderUpColor: "#059669",
      borderDownColor: "#dc2626",
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
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
      color: signal.type === "bullish" ? "#047857" : "#b91c1c",
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
      className="h-[420px] w-full min-w-0 overflow-hidden rounded-md border border-zinc-200 bg-white sm:h-[520px] lg:h-[620px]"
      aria-label="Grafico de candles do Ibovespa com sinais de momento"
    />
  );
}
