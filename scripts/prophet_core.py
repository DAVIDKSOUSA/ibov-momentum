from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from prophet import Prophet


logging.getLogger("cmdstanpy").disabled = True
logging.getLogger("prophet").setLevel(logging.ERROR)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SIGNALS_PATH = PROJECT_ROOT / "public" / "data" / "ibov-signals.json"
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "ibov-prophet.json"
TICKER = "^BVSP"

DEFAULT_CONFIG: dict[str, Any] = {
    "target": "log_close",
    "horizonBusinessDays": 20,
    "validationWindow": 60,
    "nChangepoints": 10,
    "changepointRange": 0.8,
    "changepointPriorScale": 0.03,
    "seasonalityMode": "multiplicative",
    "seasonalityPriorScale": 1.0,
    "weeklySeasonality": True,
    "yearlySeasonality": True,
    "dailySeasonality": False,
    "intervalWidth": 0.95,
    "uncertaintySamples": 20,
}


def generate_prophet_dataset(config_input: dict[str, Any] | None = None) -> dict[str, Any]:
    config = normalize_config(config_input or {})
    price_frame = load_price_frame()
    close = price_frame["Close"].astype(float)
    target = np.log(close) if config["target"] == "log_close" else close
    prophet_frame = pd.DataFrame(
        {
            "ds": price_frame.index.tz_localize(None),
            "y": target.to_numpy(),
        }
    )

    model = build_model(config)
    model.fit(prophet_frame)

    future = model.make_future_dataframe(
        periods=config["horizonBusinessDays"],
        freq="B",
        include_history=True,
    )
    forecast_frame = model.predict(future)

    history = to_history(price_frame)
    forecast = to_forecast(forecast_frame, history[-1]["time"], config)
    changepoints = to_changepoints(model)
    summary = to_summary(history, forecast)
    metrics = validation_metrics(prophet_frame, close.to_numpy(), config)

    return {
        "asset": "IBOV",
        "source": "yfinance",
        "model": "prophet",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "config": to_public_config(config),
        "summary": summary,
        "metrics": metrics,
        "history": history,
        "forecast": forecast,
        "changepoints": changepoints,
    }


def write_dataset(
    config_input: dict[str, Any] | None = None,
    output_path: Path = OUTPUT_PATH,
) -> dict[str, Any]:
    dataset = generate_prophet_dataset(config_input)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return dataset


def normalize_config(config_input: dict[str, Any]) -> dict[str, Any]:
    return {
        "target": "close" if config_input.get("target") == "close" else "log_close",
        "horizonBusinessDays": clamp_int(
            config_input.get("horizonBusinessDays"),
            DEFAULT_CONFIG["horizonBusinessDays"],
            5,
            60,
        ),
        "validationWindow": clamp_int(
            config_input.get("validationWindow"),
            DEFAULT_CONFIG["validationWindow"],
            20,
            120,
        ),
        "nChangepoints": clamp_int(
            config_input.get("nChangepoints"),
            DEFAULT_CONFIG["nChangepoints"],
            5,
            80,
        ),
        "changepointRange": clamp_float(
            config_input.get("changepointRange"),
            DEFAULT_CONFIG["changepointRange"],
            0.6,
            0.95,
        ),
        "changepointPriorScale": clamp_float(
            config_input.get("changepointPriorScale"),
            DEFAULT_CONFIG["changepointPriorScale"],
            0.001,
            0.3,
        ),
        "seasonalityMode": (
            "additive"
            if config_input.get("seasonalityMode") == "additive"
            else "multiplicative"
        ),
        "seasonalityPriorScale": clamp_float(
            config_input.get("seasonalityPriorScale"),
            DEFAULT_CONFIG["seasonalityPriorScale"],
            0.1,
            20,
        ),
        "weeklySeasonality": to_bool(
            config_input.get("weeklySeasonality"),
            DEFAULT_CONFIG["weeklySeasonality"],
        ),
        "yearlySeasonality": to_bool(
            config_input.get("yearlySeasonality"),
            DEFAULT_CONFIG["yearlySeasonality"],
        ),
        "dailySeasonality": to_bool(
            config_input.get("dailySeasonality"),
            DEFAULT_CONFIG["dailySeasonality"],
        ),
        "intervalWidth": clamp_float(
            config_input.get("intervalWidth"),
            DEFAULT_CONFIG["intervalWidth"],
            0.5,
            0.95,
        ),
        "uncertaintySamples": DEFAULT_CONFIG["uncertaintySamples"],
    }


def build_model(config: dict[str, Any]) -> Prophet:
    return Prophet(
        growth="linear",
        n_changepoints=config["nChangepoints"],
        changepoint_range=config["changepointRange"],
        changepoint_prior_scale=config["changepointPriorScale"],
        seasonality_mode=config["seasonalityMode"],
        seasonality_prior_scale=config["seasonalityPriorScale"],
        weekly_seasonality=config["weeklySeasonality"],
        yearly_seasonality=config["yearlySeasonality"],
        daily_seasonality=config["dailySeasonality"],
        interval_width=config["intervalWidth"],
        uncertainty_samples=config["uncertaintySamples"],
    )


def load_price_frame() -> pd.DataFrame:
    if SIGNALS_PATH.exists():
        raw = json.loads(SIGNALS_PATH.read_text(encoding="utf-8"))
        rows = [
            {"Date": pd.to_datetime(candle["time"]), "Close": float(candle["close"])}
            for candle in raw.get("candles", [])
            if "time" in candle and "close" in candle
        ]

        if rows:
            frame = pd.DataFrame(rows).set_index("Date").sort_index()
            return frame.tail(760).copy()

    frame = yf.download(
        TICKER,
        period="3y",
        interval="1d",
        auto_adjust=False,
        progress=False,
    )

    if frame.empty:
        raise RuntimeError("Nenhum dado retornado para o IBOV.")

    if hasattr(frame.columns, "nlevels") and frame.columns.nlevels > 1:
        frame.columns = frame.columns.get_level_values(0)

    return frame.dropna(subset=["Close"]).copy()


def to_history(price_frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {
            "time": index.strftime("%Y-%m-%d"),
            "close": round(float(row["Close"]), 2),
        }
        for index, row in price_frame.iterrows()
    ]


def to_forecast(
    forecast_frame: pd.DataFrame,
    last_history_date: str,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    rows = []

    for _, row in forecast_frame.iterrows():
        time = row["ds"].strftime("%Y-%m-%d")
        rows.append(
            {
                "time": time,
                "yhat": to_price(row["yhat"], config),
                "yhatLower": to_price(row["yhat_lower"], config),
                "yhatUpper": to_price(row["yhat_upper"], config),
                "isFuture": time > last_history_date,
            }
        )

    return rows


def to_changepoints(model: Prophet) -> list[dict[str, Any]]:
    deltas = model.params.get("delta")

    if deltas is None:
        return []

    candidates = []

    for timestamp, strength in zip(model.changepoints, deltas[0]):
        numeric_strength = float(strength)
        candidates.append(
            {
                "time": timestamp.strftime("%Y-%m-%d"),
                "strength": round(numeric_strength, 6),
                "direction": "increase" if numeric_strength >= 0 else "decrease",
            }
        )

    candidates.sort(key=lambda item: abs(float(item["strength"])), reverse=True)
    return candidates[:10]


def to_summary(
    history: list[dict[str, Any]],
    forecast: list[dict[str, Any]],
) -> dict[str, Any]:
    last_close = float(history[-1]["close"])
    target = forecast[-1]
    target_forecast = float(target["yhat"])
    projected_change_pct = (target_forecast - last_close) / last_close

    if projected_change_pct > 0.01:
        direction = "up"
    elif projected_change_pct < -0.01:
        direction = "down"
    else:
        direction = "sideways"

    if float(target["yhatLower"]) > last_close:
        confidence = "higher"
    elif float(target["yhatUpper"]) < last_close:
        confidence = "lower"
    else:
        confidence = "mixed"

    return {
        "lastDate": str(history[-1]["time"]),
        "lastClose": round(last_close, 2),
        "targetDate": str(target["time"]),
        "targetForecast": round(target_forecast, 2),
        "targetLower": round(float(target["yhatLower"]), 2),
        "targetUpper": round(float(target["yhatUpper"]), 2),
        "projectedChangePct": round(projected_change_pct, 6),
        "direction": direction,
        "confidence": confidence,
    }


def validation_metrics(
    prophet_frame: pd.DataFrame,
    actual_close: np.ndarray,
    config: dict[str, Any],
) -> dict[str, Any]:
    validation_window = min(config["validationWindow"], len(prophet_frame) // 4)

    if len(prophet_frame) <= validation_window + 120:
        return {"validationMape": None, "validationRmse": None}

    train = prophet_frame.iloc[:-validation_window].copy()
    test = prophet_frame.iloc[-validation_window:].copy()
    actual = actual_close[-validation_window:]

    validation_model = build_model(config)
    validation_model.fit(train)
    prediction = validation_model.predict(test[["ds"]])
    predicted = prediction["yhat"].to_numpy()

    if config["target"] == "log_close":
        predicted = np.exp(predicted)

    errors = predicted - actual
    rmse = float(np.sqrt(np.mean(errors**2)))
    mape = float(np.mean(np.abs(errors / actual)))

    return {
        "validationMape": round(mape, 6),
        "validationRmse": round(rmse, 2),
    }


def to_price(value: float, config: dict[str, Any]) -> float:
    if config["target"] == "log_close":
        value = float(np.exp(value))

    return round(max(float(value), 0), 2)


def to_public_config(config: dict[str, Any]) -> dict[str, Any]:
    return {
        "target": config["target"],
        "horizonBusinessDays": config["horizonBusinessDays"],
        "frequency": "B",
        "growth": "linear",
        "nChangepoints": config["nChangepoints"],
        "changepointRange": config["changepointRange"],
        "changepointPriorScale": config["changepointPriorScale"],
        "seasonalityMode": config["seasonalityMode"],
        "seasonalityPriorScale": config["seasonalityPriorScale"],
        "weeklySeasonality": config["weeklySeasonality"],
        "yearlySeasonality": config["yearlySeasonality"],
        "dailySeasonality": config["dailySeasonality"],
        "intervalWidth": config["intervalWidth"],
        "validationWindow": config["validationWindow"],
    }


def clamp_int(value: Any, fallback: int, minimum: int, maximum: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        numeric = fallback

    return max(minimum, min(maximum, numeric))


def clamp_float(value: Any, fallback: float, minimum: float, maximum: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = fallback

    if np.isnan(numeric) or np.isinf(numeric):
        numeric = fallback

    return round(max(minimum, min(maximum, numeric)), 6)


def to_bool(value: Any, fallback: bool) -> bool:
    if isinstance(value, bool):
        return value

    return fallback
