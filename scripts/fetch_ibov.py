from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "ibov-signals.json"
TICKER = "^BVSP"


def main() -> None:
    frame = yf.download(
        TICKER,
        period="1y",
        interval="1d",
        auto_adjust=False,
        progress=False,
    )

    if frame.empty:
        raise RuntimeError("Nenhum dado retornado para o IBOV.")

    if hasattr(frame.columns, "nlevels") and frame.columns.nlevels > 1:
        frame.columns = frame.columns.get_level_values(0)

    frame = frame.dropna(subset=["Open", "High", "Low", "Close"]).copy()
    frame["MA20"] = frame["Close"].rolling(window=20).mean()
    frame["MA50"] = frame["Close"].rolling(window=50).mean()

    candles = []
    signals = []
    previous_state = "neutral"

    for index, row in frame.iterrows():
        time = index.strftime("%Y-%m-%d")
        close = float(row["Close"])

        candles.append(
            {
                "time": time,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(close, 2),
            }
        )

        ma20 = row["MA20"]
        ma50 = row["MA50"]

        if ma20 != ma20 or ma50 != ma50:
            current_state = "neutral"
        elif close > float(ma20) and float(ma20) > float(ma50):
            current_state = "bullish"
        elif close < float(ma20) and float(ma20) < float(ma50):
            current_state = "bearish"
        else:
            current_state = "neutral"

        if current_state in {"bullish", "bearish"} and current_state != previous_state:
            signals.append(
                {
                    "time": time,
                    "type": current_state,
                    "price": round(close, 2),
                    "label": (
                        "Momento comprador"
                        if current_state == "bullish"
                        else "Momento vendedor"
                    ),
                }
            )

        previous_state = current_state

    dataset = {
        "asset": "IBOV",
        "source": "yfinance",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "candles": candles,
        "signals": signals,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        f"Gerado {OUTPUT_PATH.relative_to(PROJECT_ROOT)} com "
        f"{len(candles)} candles e {len(signals)} sinais."
    )


if __name__ == "__main__":
    main()
