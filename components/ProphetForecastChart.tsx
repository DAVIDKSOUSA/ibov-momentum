"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type AreaData,
  type LineData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { ProphetDataset } from "@/lib/prophet";

export type ProphetChartRange = "6m" | "1y" | "2y" | "all" | "future";

type ProphetForecastChartProps = {
  data: ProphetDataset;
  range: ProphetChartRange;
};

export default function ProphetForecastChart({
  data,
  range,
}: ProphetForecastChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const rangeRef = useRef<ProphetChartRange>(range);

  useEffect(() => {
    rangeRef.current = range;
    applyVisibleRange(chartRef.current, data, range);
  }, [data, range]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || data.forecast.length === 0) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 540,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        textColor: "#3f3f46",
      },
      grid: {
        vertLines: { color: "#eef2f7" },
        horzLines: { color: "#e4e4e7" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: "#d4d4d8",
        rightOffset: 8,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const uncertaintyUpperSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(37, 99, 235, 0.18)",
      bottomColor: "rgba(37, 99, 235, 0.04)",
      lineColor: "rgba(37, 99, 235, 0)",
      lineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const uncertaintyMaskSeries = chart.addSeries(AreaSeries, {
      topColor: "#ffffff",
      bottomColor: "#ffffff",
      lineColor: "rgba(255, 255, 255, 0)",
      lineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const upperBandLine = chart.addSeries(LineSeries, {
      color: "rgba(37, 99, 235, 0.42)",
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const lowerBandLine = chart.addSeries(LineSeries, {
      color: "rgba(37, 99, 235, 0.42)",
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const forecastSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 3,
      title: "yhat Prophet",
      lastValueVisible: true,
      priceLineVisible: false,
    });

    const historySeries = chart.addSeries(LineSeries, {
      color: "#18181b",
      lineWidth: 2,
      pointMarkersVisible: true,
      pointMarkersRadius: 1.6,
      title: "Fechamento real",
      priceLineVisible: false,
    });

    uncertaintyUpperSeries.setData(toAreaData(data, "yhatUpper"));
    uncertaintyMaskSeries.setData(toAreaData(data, "yhatLower"));
    upperBandLine.setData(toLineData(data, "yhatUpper"));
    lowerBandLine.setData(toLineData(data, "yhatLower"));
    forecastSeries.setData(toLineData(data, "yhat"));
    historySeries.setData(
      data.history.map((point) => ({
        time: point.time as Time,
        value: point.close,
      })),
    );

    createSeriesMarkers(forecastSeries, toMarkers(data), {
      autoScale: true,
    });

    chartRef.current = chart;
    applyVisibleRange(chart, data, rangeRef.current);

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chartRef.current = null;
      chart.remove();
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full min-w-0 overflow-hidden rounded-md border border-zinc-200 bg-white sm:h-[560px] lg:h-[640px]"
      aria-label="Grafico interativo Prophet do Ibovespa"
    />
  );
}

function toLineData(
  data: ProphetDataset,
  key: "yhat" | "yhatLower" | "yhatUpper",
): LineData<Time>[] {
  return data.forecast.map((point) => ({
    time: point.time as Time,
    value: point[key],
  }));
}

function toAreaData(
  data: ProphetDataset,
  key: "yhatLower" | "yhatUpper",
): AreaData<Time>[] {
  return data.forecast.map((point) => ({
    time: point.time as Time,
    value: point[key],
  }));
}

function toMarkers(data: ProphetDataset): SeriesMarker<Time>[] {
  const firstFuture = data.forecast.find((point) => point.isFuture);
  const changepoints = data.changepoints.map((point) => ({
    time: point.time as Time,
    position: "inBar" as const,
    shape: "square" as const,
    color: point.direction === "increase" ? "#2563eb" : "#71717a",
    text: point.direction === "increase" ? "CP +" : "CP -",
    size: 0.8,
  }));

  if (!firstFuture) {
    return changepoints;
  }

  return [
    ...changepoints,
    {
      time: firstFuture.time as Time,
      position: "aboveBar",
      shape: "circle",
      color: "#2563eb",
      text: "inicio forecast",
      size: 1,
    },
  ];
}

function applyVisibleRange(
  chart: ReturnType<typeof createChart> | null,
  data: ProphetDataset,
  range: ProphetChartRange,
) {
  if (!chart || data.forecast.length === 0) {
    return;
  }

  if (range === "all") {
    chart.timeScale().fitContent();
    return;
  }

  const forecast = data.forecast;
  const lastIndex = forecast.length - 1;
  const firstFutureIndex = forecast.findIndex((point) => point.isFuture);
  const startIndexByRange = {
    "6m": Math.max(0, lastIndex - 126),
    "1y": Math.max(0, lastIndex - 252),
    "2y": Math.max(0, lastIndex - 504),
    future: Math.max(0, firstFutureIndex - 30),
  } satisfies Record<Exclude<ProphetChartRange, "all">, number>;

  const from = forecast[startIndexByRange[range]]?.time;
  const to = forecast[lastIndex]?.time;

  if (!from || !to) {
    chart.timeScale().fitContent();
    return;
  }

  chart.timeScale().setVisibleRange({
    from: from as Time,
    to: to as Time,
  });
}
