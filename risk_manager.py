from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_DOWN
from typing import Optional

from config import BotConfig
from logger import CSVJournal
from strategy import Signal


@dataclass(frozen=True)
class InstrumentRules:
    min_order_qty: float
    qty_step: float
    tick_size: float


@dataclass(frozen=True)
class PositionPlan:
    signal: Signal
    quantity: float
    entry: float
    stop_loss: float
    take_profit: float
    planned_risk_usd: float
    planned_profit_usd: float
    rr: float


class RiskManager:
    def __init__(self, config: BotConfig, journal: CSVJournal) -> None:
        self.config = config
        self.journal = journal

    def trading_allowed(self) -> tuple[bool, str]:
        trades_today, pnl_today, consecutive_losses = self.journal.read_today_stats()
        if trades_today >= self.config.max_trades_per_day:
            return False, "maximum trades per day reached"
        if pnl_today <= -abs(self.config.max_daily_loss_usd):
            return False, "maximum daily loss reached"
        if consecutive_losses >= self.config.max_consecutive_losses:
            return False, "maximum consecutive losses reached"
        return True, "risk gates passed"

    def build_position_plan(
        self,
        signal: Signal,
        rules: InstrumentRules,
        wallet_equity_usd: Optional[float] = None,
    ) -> tuple[Optional[PositionPlan], str]:
        if signal.rr < self.config.minimum_rr:
            return None, "signal RR is below minimum"

        raw_quantity = self.config.risk_per_trade_usd / signal.risk_distance
        quantity = self._round_down(raw_quantity, rules.qty_step)
        if wallet_equity_usd is not None and wallet_equity_usd > 0:
            max_notional = wallet_equity_usd * self.config.leverage * 0.95
            max_quantity = self._round_down(max_notional / signal.entry, rules.qty_step)
            quantity = min(quantity, max_quantity)

        if quantity < rules.min_order_qty:
            return (
                None,
                (
                    f"calculated quantity {quantity} is below exchange minimum "
                    f"{rules.min_order_qty}"
                ),
            )

        entry = self._round_price(signal.entry, rules.tick_size)
        stop_loss = self._round_price(signal.stop_loss, rules.tick_size)
        take_profit = self._round_price(signal.take_profit, rules.tick_size)

        risk_distance = abs(entry - stop_loss)
        profit_distance = abs(take_profit - entry)
        if risk_distance <= 0:
            return None, "rounded stop loss creates zero risk distance"
        rr = profit_distance / risk_distance
        if rr < self.config.minimum_rr:
            return None, f"rounded RR {rr:.2f} is below minimum {self.config.minimum_rr:.2f}"

        planned_risk = risk_distance * quantity
        planned_profit = profit_distance * quantity
        if planned_risk > self.config.risk_per_trade_usd * 1.03:
            return None, "rounded quantity exceeds configured dollar risk"
        if planned_profit < self.config.target_profit_usd and rr < self.config.desired_profit_rr:
            return None, "target profit cannot be reached without lowering RR quality"

        return (
            PositionPlan(
                signal=signal,
                quantity=quantity,
                entry=entry,
                stop_loss=stop_loss,
                take_profit=take_profit,
                planned_risk_usd=planned_risk,
                planned_profit_usd=planned_profit,
                rr=rr,
            ),
            "position plan accepted",
        )

    @staticmethod
    def _round_down(value: float, step: float) -> float:
        if step <= 0:
            return value
        value_decimal = Decimal(str(value))
        step_decimal = Decimal(str(step))
        rounded = (value_decimal / step_decimal).to_integral_value(
            rounding=ROUND_DOWN
        ) * step_decimal
        return float(rounded)

    @staticmethod
    def _round_price(value: float, tick_size: float) -> float:
        if tick_size <= 0:
            return value
        tick_decimal = Decimal(str(tick_size))
        value_decimal = Decimal(str(value))
        rounded = (value_decimal / tick_decimal).to_integral_value(
            rounding=ROUND_DOWN
        ) * tick_decimal
        return float(rounded)
