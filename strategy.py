from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal, Optional

from config import BotConfig


Direction = Literal["long", "short"]


@dataclass(frozen=True)
class Candle:
    timestamp_ms: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    @classmethod
    def from_bybit_kline(cls, row: list[str | int | float]) -> "Candle":
        return cls(
            timestamp_ms=int(row[0]),
            open=float(row[1]),
            high=float(row[2]),
            low=float(row[3]),
            close=float(row[4]),
            volume=float(row[5]),
        )


@dataclass(frozen=True)
class Signal:
    symbol: str
    direction: Direction
    entry: float
    stop_loss: float
    take_profit: float
    rr: float
    risk_distance: float
    reason: str
    metadata: dict[str, float | int | str] = field(default_factory=dict)

    @property
    def side(self) -> str:
        return "Buy" if self.direction == "long" else "Sell"


@dataclass(frozen=True)
class StrategyResult:
    signal: Optional[Signal]
    reason: str


def ema(values: list[float], period: int) -> list[Optional[float]]:
    if period <= 0:
        raise ValueError("EMA period must be positive")
    if not values:
        return []

    multiplier = 2 / (period + 1)
    result: list[Optional[float]] = []
    current: Optional[float] = None

    for index, value in enumerate(values):
        if index + 1 < period:
            result.append(None)
            continue
        if current is None:
            current = sum(values[index + 1 - period : index + 1]) / period
        else:
            current = (value - current) * multiplier + current
        result.append(current)
    return result


def atr(candles: list[Candle], period: int) -> list[Optional[float]]:
    if period <= 0:
        raise ValueError("ATR period must be positive")
    if len(candles) < 2:
        return [None for _ in candles]

    true_ranges: list[float] = []
    for index, candle in enumerate(candles):
        if index == 0:
            true_ranges.append(candle.high - candle.low)
            continue
        previous_close = candles[index - 1].close
        true_ranges.append(
            max(
                candle.high - candle.low,
                abs(candle.high - previous_close),
                abs(candle.low - previous_close),
            )
        )

    result: list[Optional[float]] = []
    smoothed: Optional[float] = None
    for index, true_range in enumerate(true_ranges):
        if index + 1 < period:
            result.append(None)
            continue
        if smoothed is None:
            smoothed = sum(true_ranges[index + 1 - period : index + 1]) / period
        else:
            smoothed = ((smoothed * (period - 1)) + true_range) / period
        result.append(smoothed)
    return result


def _latest(values: list[Optional[float]]) -> Optional[float]:
    for value in reversed(values):
        if value is not None:
            return value
    return None


def _trend_direction(candles: list[Candle]) -> Optional[Direction]:
    closes = [candle.close for candle in candles]
    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    fast = _latest(ema50)
    slow = _latest(ema200)
    if fast is None or slow is None:
        return None
    last_close = candles[-1].close
    if fast > slow and last_close > fast:
        return "long"
    if fast < slow and last_close < fast:
        return "short"
    return None


def _pivots(candles: list[Candle], strength: int = 2) -> tuple[list[int], list[int]]:
    highs: list[int] = []
    lows: list[int] = []
    for index in range(strength, len(candles) - strength):
        window = candles[index - strength : index + strength + 1]
        high = candles[index].high
        low = candles[index].low
        if high == max(candle.high for candle in window):
            highs.append(index)
        if low == min(candle.low for candle in window):
            lows.append(index)
    return highs, lows


def _fallback_high(candles: list[Candle], end_index: int, lookback: int) -> tuple[int, float]:
    start = max(0, end_index - lookback)
    segment = candles[start:end_index]
    relative_index, candle = max(enumerate(segment), key=lambda item: item[1].high)
    return start + relative_index, candle.high


def _fallback_low(candles: list[Candle], end_index: int, lookback: int) -> tuple[int, float]:
    start = max(0, end_index - lookback)
    segment = candles[start:end_index]
    relative_index, candle = min(enumerate(segment), key=lambda item: item[1].low)
    return start + relative_index, candle.low


def _latest_pivot_high_before(
    candles: list[Candle], end_index: int, lookback: int = 60
) -> tuple[int, float]:
    highs, _ = _pivots(candles[:end_index])
    highs = [index for index in highs if index >= max(0, end_index - lookback)]
    if highs:
        index = highs[-1]
        return index, candles[index].high
    return _fallback_high(candles, end_index, lookback)


def _latest_pivot_low_before(
    candles: list[Candle], end_index: int, lookback: int = 60
) -> tuple[int, float]:
    _, lows = _pivots(candles[:end_index])
    lows = [index for index in lows if index >= max(0, end_index - lookback)]
    if lows:
        index = lows[-1]
        return index, candles[index].low
    return _fallback_low(candles, end_index, lookback)


def _find_liquidity_sweep(
    candles: list[Candle], direction: Direction, lookback: int = 5
) -> Optional[tuple[int, float]]:
    start = max(20, len(candles) - lookback)
    for index in range(len(candles) - 1, start - 1, -1):
        candle = candles[index]
        if direction == "long":
            _, swing_low = _latest_pivot_low_before(candles, index, lookback=80)
            if candle.low < swing_low and candle.close > swing_low:
                return index, swing_low
        else:
            _, swing_high = _latest_pivot_high_before(candles, index, lookback=80)
            if candle.high > swing_high and candle.close < swing_high:
                return index, swing_high
    return None


def _has_bos_after_sweep(
    candles: list[Candle], direction: Direction, sweep_index: int
) -> tuple[bool, float]:
    current_close = candles[-1].close
    if direction == "long":
        _, break_level = _latest_pivot_high_before(candles, len(candles) - 1, lookback=40)
        return current_close > break_level and len(candles) - 1 >= sweep_index, break_level

    _, break_level = _latest_pivot_low_before(candles, len(candles) - 1, lookback=40)
    return current_close < break_level and len(candles) - 1 >= sweep_index, break_level


def _latest_fvg(
    candles: list[Candle], direction: Direction, start_index: int
) -> Optional[tuple[int, float, float]]:
    search_start = max(2, start_index)
    for index in range(len(candles) - 1, search_start - 1, -1):
        left = candles[index - 2]
        right = candles[index]
        if direction == "long" and left.high < right.low:
            return index, left.high, right.low
        if direction == "short" and left.low > right.high:
            return index, right.high, left.low
    return None


def _latest_order_block(
    candles: list[Candle], direction: Direction, start_index: int
) -> Optional[tuple[int, float, float]]:
    for index in range(len(candles) - 2, max(0, start_index - 10), -1):
        candle = candles[index]
        next_candle = candles[index + 1]
        if direction == "long" and candle.close < candle.open and next_candle.close > next_candle.open:
            return index, candle.low, candle.high
        if direction == "short" and candle.close > candle.open and next_candle.close < next_candle.open:
            return index, candle.low, candle.high
    return None


def _in_discount_or_premium(candles: list[Candle], direction: Direction) -> tuple[bool, float]:
    lookback = min(80, len(candles))
    segment = candles[-lookback:]
    range_high = max(candle.high for candle in segment)
    range_low = min(candle.low for candle in segment)
    midpoint = (range_high + range_low) / 2
    close = candles[-1].close
    if direction == "long":
        return close <= midpoint, midpoint
    return close >= midpoint, midpoint


def _volume_ok(candles: list[Candle], config: BotConfig) -> tuple[bool, float]:
    if not config.use_volume_filter:
        return True, 0.0
    lookback = min(config.volume_lookback, len(candles) - 1)
    if lookback < 5:
        return False, 0.0
    recent = candles[-lookback - 1 : -1]
    average_volume = sum(candle.volume for candle in recent) / lookback
    if average_volume <= 0:
        return False, average_volume
    return candles[-1].volume >= average_volume * config.min_volume_multiplier, average_volume


def _atr_ok(
    candles: list[Candle], config: BotConfig
) -> tuple[bool, Optional[float], Optional[float]]:
    atr_values = atr(candles, config.atr_period)
    current_atr = _latest(atr_values)
    if not config.use_atr_filter:
        return True, current_atr, None
    if current_atr is None:
        return False, current_atr, None
    atr_window = [value for value in atr_values[-50:] if value is not None]
    if len(atr_window) < 10:
        return False, current_atr, None
    average_atr = sum(atr_window) / len(atr_window)
    atr_pct = current_atr / candles[-1].close
    if atr_pct < config.min_atr_pct:
        return False, current_atr, average_atr
    if current_atr > average_atr * config.max_atr_multiplier:
        return False, current_atr, average_atr
    return True, current_atr, average_atr


def _spread_ok(spread_bps: Optional[float], config: BotConfig) -> bool:
    if spread_bps is None:
        return True
    return spread_bps <= config.max_spread_bps


def _session_ok(now_utc: datetime, config: BotConfig) -> bool:
    if not config.use_session_filter:
        return True
    current = now_utc.time().replace(second=0, microsecond=0)
    start = config.session_start
    end = config.session_end
    if start <= end:
        return start <= current <= end
    return current >= start or current <= end


def generate_signal(
    symbol: str,
    entry_candles: list[Candle],
    h1_candles: list[Candle],
    h4_candles: list[Candle],
    config: BotConfig,
    spread_bps: Optional[float] = None,
    now_utc: Optional[datetime] = None,
) -> StrategyResult:
    now_utc = now_utc or datetime.now(timezone.utc)
    minimum_bars = max(220, config.atr_period + config.volume_lookback + 20)
    if len(entry_candles) < minimum_bars:
        return StrategyResult(None, f"need at least {minimum_bars} entry candles")
    if len(h1_candles) < 220 or len(h4_candles) < 220:
        return StrategyResult(None, "need at least 220 H1 and H4 candles")
    if not _session_ok(now_utc, config):
        return StrategyResult(None, "outside configured trading session")
    if not _spread_ok(spread_bps, config):
        return StrategyResult(None, f"spread {spread_bps:.2f} bps exceeds limit")

    h1_trend = _trend_direction(h1_candles)
    h4_trend = _trend_direction(h4_candles)
    if h1_trend is None or h4_trend is None:
        return StrategyResult(None, "H1/H4 trend is not clean")
    if h1_trend != h4_trend:
        return StrategyResult(None, f"H1 trend {h1_trend} conflicts with H4 trend {h4_trend}")

    direction = h1_trend
    if direction == "long" and not config.enable_long_trades:
        return StrategyResult(None, "long trades disabled")
    if direction == "short" and not config.enable_short_trades:
        return StrategyResult(None, "short trades disabled")

    atr_passed, current_atr, average_atr = _atr_ok(entry_candles, config)
    if not atr_passed or current_atr is None:
        return StrategyResult(None, "ATR filter rejected current conditions")
    volume_passed, average_volume = _volume_ok(entry_candles, config)
    if not volume_passed:
        return StrategyResult(None, "volume filter rejected current conditions")

    sweep = _find_liquidity_sweep(entry_candles, direction)
    if sweep is None:
        return StrategyResult(None, f"no {direction} liquidity sweep")
    sweep_index, swept_level = sweep

    bos_passed, break_level = _has_bos_after_sweep(entry_candles, direction, sweep_index)
    if not bos_passed:
        return StrategyResult(None, "no BOS/CHoCH confirmation after sweep")

    fvg = _latest_fvg(entry_candles, direction, sweep_index)
    if fvg is None:
        return StrategyResult(None, "no qualifying fair value gap")
    fvg_index, fvg_low, fvg_high = fvg
    fvg_midpoint = (fvg_low + fvg_high) / 2

    entry = entry_candles[-1].close
    not_chasing_distance = abs(entry - fvg_midpoint)
    if not_chasing_distance > current_atr * 0.75:
        return StrategyResult(None, "entry is too far from FVG midpoint")

    pd_passed, pd_midpoint = _in_discount_or_premium(entry_candles, direction)
    if not pd_passed:
        return StrategyResult(None, "premium/discount filter rejected setup")

    sweep_candle = entry_candles[sweep_index]
    stop_buffer = current_atr * 0.20
    if direction == "long":
        stop_loss = min(sweep_candle.low, swept_level) - stop_buffer
        risk_distance = entry - stop_loss
        target_rr = max(config.minimum_rr, config.desired_profit_rr)
        take_profit = entry + (risk_distance * target_rr)
    else:
        stop_loss = max(sweep_candle.high, swept_level) + stop_buffer
        risk_distance = stop_loss - entry
        target_rr = max(config.minimum_rr, config.desired_profit_rr)
        take_profit = entry - (risk_distance * target_rr)

    if risk_distance <= 0:
        return StrategyResult(None, "invalid stop placement")
    rr = abs(take_profit - entry) / risk_distance
    if rr < config.minimum_rr:
        return StrategyResult(None, f"RR {rr:.2f} is below minimum {config.minimum_rr:.2f}")

    order_block = _latest_order_block(entry_candles, direction, sweep_index)
    metadata: dict[str, float | int | str] = {
        "h1_trend": h1_trend,
        "h4_trend": h4_trend,
        "entry_timestamp_ms": entry_candles[-1].timestamp_ms,
        "atr": round(current_atr, 4),
        "average_atr": round(average_atr or 0.0, 4),
        "average_volume": round(average_volume, 4),
        "sweep_index": sweep_index,
        "swept_level": round(swept_level, 2),
        "bos_level": round(break_level, 2),
        "fvg_index": fvg_index,
        "fvg_low": round(fvg_low, 2),
        "fvg_high": round(fvg_high, 2),
        "premium_discount_midpoint": round(pd_midpoint, 2),
    }
    if order_block is not None:
        order_block_index, order_block_low, order_block_high = order_block
        metadata.update(
            {
                "order_block_index": order_block_index,
                "order_block_low": round(order_block_low, 2),
                "order_block_high": round(order_block_high, 2),
            }
        )

    signal = Signal(
        symbol=symbol,
        direction=direction,
        entry=entry,
        stop_loss=stop_loss,
        take_profit=take_profit,
        rr=rr,
        risk_distance=risk_distance,
        reason=(
            f"{direction} trend alignment, liquidity sweep, BOS/CHoCH, FVG, "
            "premium/discount, ATR and volume filters passed"
        ),
        metadata=metadata,
    )
    return StrategyResult(signal, "signal generated")
