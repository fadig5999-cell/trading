"""Trend-following plus liquidity strategy logic for BTCUSDT.

The functions in this module are intentionally exchange-agnostic and operate on
OHLCV DataFrames. That keeps the signal engine reusable for backtesting,
paper-trading, and live testnet execution.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd

from config import BotConfig


@dataclass(frozen=True)
class TradeSignal:
    side: str
    symbol: str
    timeframe: str
    entry_price: float
    stop_loss: float
    take_profit: float
    reward_to_risk: float
    reason: str
    generated_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def risk_distance(self) -> float:
        return abs(self.entry_price - self.stop_loss)

    @property
    def target_distance(self) -> float:
        return abs(self.take_profit - self.entry_price)


@dataclass(frozen=True)
class StrategyDecision:
    signal: Optional[TradeSignal]
    reason: str
    diagnostics: Dict[str, Any] = field(default_factory=dict)


def _require_columns(df: pd.DataFrame) -> None:
    required = {"timestamp", "open", "high", "low", "close", "volume"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"OHLCV DataFrame missing required columns: {sorted(missing)}")


def normalize_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    """Return ascending, numeric OHLCV data suitable for indicator calculation."""

    _require_columns(df)
    normalized = df.copy()
    normalized["timestamp"] = pd.to_datetime(normalized["timestamp"], utc=True)
    for column in ("open", "high", "low", "close", "volume"):
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    normalized = normalized.dropna(subset=["open", "high", "low", "close", "volume"])
    normalized = normalized.sort_values("timestamp").drop_duplicates("timestamp")
    normalized = normalized.reset_index(drop=True)
    return normalized


def calculate_indicators(df: pd.DataFrame, config: BotConfig) -> pd.DataFrame:
    """Add EMAs, ATR, volume ratio, and confirmed swing points."""

    data = normalize_ohlcv(df)
    data["ema_50"] = data["close"].ewm(span=50, adjust=False).mean()
    data["ema_200"] = data["close"].ewm(span=200, adjust=False).mean()

    previous_close = data["close"].shift(1)
    true_range = pd.concat(
        [
            data["high"] - data["low"],
            (data["high"] - previous_close).abs(),
            (data["low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    data["atr"] = true_range.ewm(alpha=1 / config.ATR_PERIOD, adjust=False).mean()
    data["atr_pct"] = data["atr"] / data["close"]
    data["volume_sma"] = data["volume"].rolling(config.VOLUME_SMA_PERIOD).mean()
    data["volume_ratio"] = data["volume"] / data["volume_sma"]
    data["body"] = (data["close"] - data["open"]).abs()
    data["range"] = data["high"] - data["low"]
    data["body_ratio"] = data["body"] / data["range"].replace(0, np.nan)

    window = 5
    centered_high = data["high"].rolling(window=window, center=True).max()
    centered_low = data["low"].rolling(window=window, center=True).min()
    data["swing_high"] = (data["high"] == centered_high).fillna(False)
    data["swing_low"] = (data["low"] == centered_low).fillna(False)
    return data


def _current_session_allowed(now: datetime, config: BotConfig) -> bool:
    if not config.USE_SESSION_FILTER:
        return True
    current = now.time().replace(second=0, microsecond=0)
    start = config.session_start_time
    end = config.session_end_time
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def _trend_from_timeframe(data: pd.DataFrame) -> str:
    last = data.iloc[-1]
    previous = data.iloc[-6] if len(data) >= 6 else data.iloc[-2]
    bullish = (
        last["close"] > last["ema_50"] > last["ema_200"]
        and last["ema_50"] >= previous["ema_50"]
    )
    bearish = (
        last["close"] < last["ema_50"] < last["ema_200"]
        and last["ema_50"] <= previous["ema_50"]
    )
    if bullish:
        return "bullish"
    if bearish:
        return "bearish"
    return "neutral"


def _confirmed_swing_values(data: pd.DataFrame, before_index: int) -> Tuple[Optional[float], Optional[float]]:
    history = data.iloc[:before_index]
    swing_highs = history.loc[history["swing_high"], "high"]
    swing_lows = history.loc[history["swing_low"], "low"]
    last_high = float(swing_highs.iloc[-1]) if not swing_highs.empty else None
    last_low = float(swing_lows.iloc[-1]) if not swing_lows.empty else None
    return last_high, last_low


def _detect_liquidity_sweep(data: pd.DataFrame, direction: str, lookback: int = 8) -> Optional[Dict[str, Any]]:
    start = max(10, len(data) - lookback)
    for idx in range(start, len(data)):
        prior_high, prior_low = _confirmed_swing_values(data, idx)
        candle = data.iloc[idx]
        if direction == "long" and prior_low is not None:
            swept = candle["low"] < prior_low and candle["close"] > prior_low
            if swept:
                return {
                    "index": idx,
                    "swept_level": prior_low,
                    "sweep_low": float(candle["low"]),
                    "timestamp": candle["timestamp"],
                }
        if direction == "short" and prior_high is not None:
            swept = candle["high"] > prior_high and candle["close"] < prior_high
            if swept:
                return {
                    "index": idx,
                    "swept_level": prior_high,
                    "sweep_high": float(candle["high"]),
                    "timestamp": candle["timestamp"],
                }
    return None


def _detect_structure_break(
    data: pd.DataFrame, direction: str, sweep_index: int, lookback: int = 40
) -> Optional[Dict[str, Any]]:
    prior = data.iloc[max(0, sweep_index - lookback) : sweep_index]
    if direction == "long":
        swing_highs = prior.loc[prior["swing_high"], "high"]
        if swing_highs.empty:
            return None
        break_level = float(swing_highs.iloc[-1])
        after_sweep = data.iloc[sweep_index:]
        break_candles = after_sweep.loc[after_sweep["close"] > break_level]
        if not break_candles.empty:
            candle = break_candles.iloc[-1]
            return {"type": "BOS/CHoCH", "level": break_level, "index": int(candle.name)}
    else:
        swing_lows = prior.loc[prior["swing_low"], "low"]
        if swing_lows.empty:
            return None
        break_level = float(swing_lows.iloc[-1])
        after_sweep = data.iloc[sweep_index:]
        break_candles = after_sweep.loc[after_sweep["close"] < break_level]
        if not break_candles.empty:
            candle = break_candles.iloc[-1]
            return {"type": "BOS/CHoCH", "level": break_level, "index": int(candle.name)}
    return None


def _find_recent_fvg(data: pd.DataFrame, direction: str, lookback: int = 16) -> Optional[Dict[str, Any]]:
    start = max(2, len(data) - lookback)
    for idx in range(len(data) - 1, start - 1, -1):
        current = data.iloc[idx]
        two_back = data.iloc[idx - 2]
        if direction == "long" and current["low"] > two_back["high"]:
            return {
                "index": idx,
                "low": float(two_back["high"]),
                "high": float(current["low"]),
                "mid": float((two_back["high"] + current["low"]) / 2),
            }
        if direction == "short" and current["high"] < two_back["low"]:
            return {
                "index": idx,
                "low": float(current["high"]),
                "high": float(two_back["low"]),
                "mid": float((current["high"] + two_back["low"]) / 2),
            }
    return None


def _find_order_block(data: pd.DataFrame, direction: str, break_index: int, lookback: int = 20) -> Optional[Dict[str, Any]]:
    start = max(0, break_index - lookback)
    candidates = data.iloc[start:break_index]
    if candidates.empty:
        return None
    if direction == "long":
        opposite = candidates.loc[candidates["close"] < candidates["open"]]
    else:
        opposite = candidates.loc[candidates["close"] > candidates["open"]]
    if opposite.empty:
        return None
    candle = opposite.iloc[-1]
    return {
        "index": int(candle.name),
        "low": float(candle["low"]),
        "high": float(candle["high"]),
        "mid": float((candle["high"] + candle["low"]) / 2),
    }


def _premium_discount_position(data: pd.DataFrame, lookback: int = 60) -> Dict[str, float]:
    recent = data.iloc[-lookback:]
    high = float(recent["high"].max())
    low = float(recent["low"].min())
    close = float(data.iloc[-1]["close"])
    if high <= low:
        return {"range_high": high, "range_low": low, "position": 0.5, "mid": close}
    position = (close - low) / (high - low)
    return {"range_high": high, "range_low": low, "position": float(position), "mid": float((high + low) / 2)}


def _volatility_volume_ok(data: pd.DataFrame, config: BotConfig) -> Tuple[bool, str, Dict[str, Any]]:
    last = data.iloc[-1]
    diagnostics = {
        "atr_pct": float(last["atr_pct"]),
        "volume_ratio": None if pd.isna(last["volume_ratio"]) else float(last["volume_ratio"]),
        "body_ratio": None if pd.isna(last["body_ratio"]) else float(last["body_ratio"]),
    }
    if config.USE_ATR_FILTER:
        if pd.isna(last["atr_pct"]) or last["atr_pct"] < config.MIN_ATR_PCT:
            return False, "ATR too low for a clean BTCUSDT move", diagnostics
        if last["atr_pct"] > config.MAX_ATR_PCT:
            return False, "ATR volatility spike is too large", diagnostics
    if config.USE_VOLUME_FILTER:
        if pd.isna(last["volume_ratio"]) or last["volume_ratio"] < config.MIN_VOLUME_RATIO:
            return False, "Volume is below the configured participation threshold", diagnostics
    if not pd.isna(last["body_ratio"]) and last["body_ratio"] > 0.85:
        return False, "Latest candle is extended; avoiding a chase entry", diagnostics
    return True, "Volatility and volume filters passed", diagnostics


def _build_signal(data: pd.DataFrame, direction: str, config: BotConfig) -> StrategyDecision:
    side = "Buy" if direction == "long" else "Sell"
    if side == "Buy" and not config.ENABLE_LONG_TRADES:
        return StrategyDecision(None, "Long trades are disabled")
    if side == "Sell" and not config.ENABLE_SHORT_TRADES:
        return StrategyDecision(None, "Short trades are disabled")

    sweep = _detect_liquidity_sweep(data, direction)
    if sweep is None:
        return StrategyDecision(None, f"No confirmed {direction} liquidity sweep")

    structure_break = _detect_structure_break(data, direction, int(sweep["index"]))
    if structure_break is None:
        return StrategyDecision(None, f"No {direction} BOS/CHoCH after sweep")

    fvg = _find_recent_fvg(data, direction)
    if fvg is None:
        return StrategyDecision(None, f"No recent {direction} fair value gap")

    pd_position = _premium_discount_position(data)
    if direction == "long" and pd_position["position"] > 0.65:
        return StrategyDecision(None, "Long setup is too deep in premium; avoiding chase")
    if direction == "short" and pd_position["position"] < 0.35:
        return StrategyDecision(None, "Short setup is too deep in discount; avoiding chase")

    last = data.iloc[-1]
    entry = float(last["close"])
    atr = float(last["atr"])
    buffer = max(atr * 0.20, entry * config.SLIPPAGE_BUFFER_BPS / 10_000)
    order_block = _find_order_block(data, direction, int(structure_break["index"]))

    if direction == "long":
        structural_stop = min(float(sweep["sweep_low"]), order_block["low"] if order_block else float(sweep["sweep_low"]))
        stop_loss = structural_stop - buffer
        if entry <= stop_loss:
            return StrategyDecision(None, "Long stop is not below entry")
        if entry > fvg["high"] + atr * 0.75:
            return StrategyDecision(None, "Long entry is extended above the recent FVG")
        required_rr = max(config.MINIMUM_RR, config.TARGET_PROFIT_USD / config.RISK_PER_TRADE_USD)
        take_profit = entry + (entry - stop_loss) * required_rr
    else:
        structural_stop = max(float(sweep["sweep_high"]), order_block["high"] if order_block else float(sweep["sweep_high"]))
        stop_loss = structural_stop + buffer
        if entry >= stop_loss:
            return StrategyDecision(None, "Short stop is not above entry")
        if entry < fvg["low"] - atr * 0.75:
            return StrategyDecision(None, "Short entry is extended below the recent FVG")
        required_rr = max(config.MINIMUM_RR, config.TARGET_PROFIT_USD / config.RISK_PER_TRADE_USD)
        take_profit = entry - (stop_loss - entry) * required_rr

    rr = abs(take_profit - entry) / abs(entry - stop_loss)
    if rr < config.MINIMUM_RR:
        return StrategyDecision(None, "Reward-to-risk is below the configured minimum")

    metadata = {
        "sweep": sweep,
        "structure_break": structure_break,
        "fvg": fvg,
        "order_block": order_block,
        "premium_discount": pd_position,
        "atr": atr,
        "required_rr": required_rr,
    }
    reason = (
        f"{direction} HTF trend + liquidity sweep + {structure_break['type']} "
        f"+ FVG + premium/discount filter"
    )
    return StrategyDecision(
        TradeSignal(
            side=side,
            symbol=config.SYMBOL,
            timeframe=config.ENTRY_TIMEFRAME,
            entry_price=entry,
            stop_loss=float(stop_loss),
            take_profit=float(take_profit),
            reward_to_risk=float(rr),
            reason=reason,
            generated_at=datetime.now(timezone.utc),
            metadata=metadata,
        ),
        "Signal generated",
        metadata,
    )


def generate_signal(
    entry_df: pd.DataFrame,
    h1_df: pd.DataFrame,
    h4_df: pd.DataFrame,
    config: BotConfig,
    now: Optional[datetime] = None,
) -> StrategyDecision:
    """Generate a trade signal or explain why no trade is valid."""

    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    if not _current_session_allowed(current_time, config):
        return StrategyDecision(None, "Outside configured trading session")

    entry_data = calculate_indicators(entry_df, config)
    h1_data = calculate_indicators(h1_df, config)
    h4_data = calculate_indicators(h4_df, config)

    if len(entry_data) < 220 or len(h1_data) < 220 or len(h4_data) < 220:
        return StrategyDecision(None, "Not enough candle history for EMA 200 and structure logic")

    filters_ok, filter_reason, filter_diagnostics = _volatility_volume_ok(entry_data, config)
    if not filters_ok:
        return StrategyDecision(None, filter_reason, filter_diagnostics)

    h1_trend = _trend_from_timeframe(h1_data)
    h4_trend = _trend_from_timeframe(h4_data)
    diagnostics: Dict[str, Any] = {
        "h1_trend": h1_trend,
        "h4_trend": h4_trend,
        **filter_diagnostics,
    }

    if h1_trend == "bullish" and h4_trend == "bullish":
        decision = _build_signal(entry_data, "long", config)
        return StrategyDecision(decision.signal, decision.reason, {**diagnostics, **decision.diagnostics})
    if h1_trend == "bearish" and h4_trend == "bearish":
        decision = _build_signal(entry_data, "short", config)
        return StrategyDecision(decision.signal, decision.reason, {**diagnostics, **decision.diagnostics})
    return StrategyDecision(None, "H1 and H4 trend filters are not aligned", diagnostics)
