"""Risk controls and CSV journaling for the trading bot."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from config import BotConfig
from strategy import TradeSignal


JOURNAL_FIELDS = [
    "timestamp",
    "event",
    "symbol",
    "side",
    "qty",
    "entry_price",
    "stop_loss",
    "take_profit",
    "reward_to_risk",
    "risk_usd",
    "expected_profit_usd",
    "order_id",
    "closed_pnl",
    "reason",
    "metadata",
]


@dataclass(frozen=True)
class PositionPlan:
    qty: float
    risk_usd: float
    expected_profit_usd: float
    required_margin_usd: float


@dataclass(frozen=True)
class RiskDecision:
    allowed: bool
    reason: str
    plan: Optional[PositionPlan] = None


class TradeJournal:
    """Append-only CSV journal for orders, skipped trades, and realized PnL."""

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            with self.path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=JOURNAL_FIELDS)
                writer.writeheader()

    def append(self, event: str, **kwargs: Any) -> None:
        row = {field: "" for field in JOURNAL_FIELDS}
        row["timestamp"] = kwargs.pop("timestamp", datetime.now(timezone.utc).isoformat())
        row["event"] = event
        for key, value in kwargs.items():
            if key not in row:
                continue
            if key == "metadata" and not isinstance(value, str):
                row[key] = json.dumps(value, default=str, sort_keys=True)
            else:
                row[key] = value
        with self.path.open("a", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=JOURNAL_FIELDS)
            writer.writerow(row)

    def load(self) -> pd.DataFrame:
        if not self.path.exists() or self.path.stat().st_size == 0:
            return pd.DataFrame(columns=JOURNAL_FIELDS)
        data = pd.read_csv(self.path)
        if data.empty:
            return pd.DataFrame(columns=JOURNAL_FIELDS)
        data["timestamp"] = pd.to_datetime(data["timestamp"], utc=True, errors="coerce")
        for column in ("qty", "entry_price", "stop_loss", "take_profit", "reward_to_risk", "risk_usd", "expected_profit_usd", "closed_pnl"):
            data[column] = pd.to_numeric(data[column], errors="coerce")
        return data.dropna(subset=["timestamp"])


class RiskManager:
    """Enforces fixed-dollar risk, daily limits, and anti-overtrading rules."""

    def __init__(self, config: BotConfig, journal: TradeJournal) -> None:
        self.config = config
        self.journal = journal

    def daily_stats(self, trading_day: Optional[date] = None) -> Dict[str, Any]:
        trading_day = trading_day or datetime.now(timezone.utc).date()
        data = self.journal.load()
        if data.empty:
            return {"trades": 0, "realized_pnl": 0.0, "losses": 0}
        same_day = data[data["timestamp"].dt.date == trading_day]
        trade_events = same_day[same_day["event"].isin(["entry_submitted", "paper_entry"])]
        closed = same_day[same_day["event"] == "closed"]
        realized_pnl = float(closed["closed_pnl"].fillna(0).sum()) if not closed.empty else 0.0
        losses = int((closed["closed_pnl"].fillna(0) < 0).sum()) if not closed.empty else 0
        return {"trades": len(trade_events), "realized_pnl": realized_pnl, "losses": losses}

    def consecutive_losses(self) -> int:
        data = self.journal.load()
        closed = data[data["event"] == "closed"].sort_values("timestamp") if not data.empty else data
        if closed.empty:
            return 0
        count = 0
        for _, row in closed.iloc[::-1].iterrows():
            pnl = float(row.get("closed_pnl", 0) or 0)
            if pnl < 0:
                count += 1
            elif pnl > 0:
                break
        return count

    def calculate_position_plan(self, signal: TradeSignal, wallet_balance_usd: Optional[float]) -> RiskDecision:
        if signal.risk_distance <= 0:
            return RiskDecision(False, "Invalid stop loss distance")
        if signal.reward_to_risk < self.config.MINIMUM_RR:
            return RiskDecision(False, "Signal RR is below configured minimum")

        qty = self.config.RISK_PER_TRADE_USD / signal.risk_distance
        expected_profit_usd = qty * signal.target_distance
        required_margin_usd = (qty * signal.entry_price) / self.config.LEVERAGE

        if expected_profit_usd + 1e-9 < self.config.RISK_PER_TRADE_USD * self.config.MINIMUM_RR:
            return RiskDecision(False, "Expected profit does not satisfy minimum RR")

        if wallet_balance_usd is not None and wallet_balance_usd > 0:
            if self.config.RISK_PER_TRADE_USD > wallet_balance_usd * 0.02:
                return RiskDecision(False, "Trade risk exceeds 2% of available wallet balance")
            if required_margin_usd > wallet_balance_usd * 0.35:
                return RiskDecision(False, "Required margin exceeds 35% of available wallet balance")

        return RiskDecision(
            True,
            "Risk checks passed",
            PositionPlan(
                qty=float(qty),
                risk_usd=float(self.config.RISK_PER_TRADE_USD),
                expected_profit_usd=float(expected_profit_usd),
                required_margin_usd=float(required_margin_usd),
            ),
        )

    def can_enter_trade(
        self,
        signal: TradeSignal,
        wallet_balance_usd: Optional[float],
        has_open_position: bool,
    ) -> RiskDecision:
        if has_open_position:
            return RiskDecision(False, "An open BTCUSDT position already exists")

        stats = self.daily_stats()
        if stats["trades"] >= self.config.MAX_TRADES_PER_DAY:
            return RiskDecision(False, "Maximum trades per day reached")
        if stats["realized_pnl"] <= -abs(self.config.MAX_DAILY_LOSS_USD):
            return RiskDecision(False, "Maximum daily loss reached")
        if self.consecutive_losses() >= self.config.MAX_CONSECUTIVE_LOSSES:
            return RiskDecision(False, "Maximum consecutive losses reached")

        return self.calculate_position_plan(signal, wallet_balance_usd)

    def record_signal_skip(self, signal: Optional[TradeSignal], reason: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self.journal.append(
            "signal_skipped",
            symbol=self.config.SYMBOL,
            side=signal.side if signal else "",
            reason=reason,
            metadata=metadata or {},
        )

    def record_entry(self, signal: TradeSignal, plan: PositionPlan, order_id: str, event: str = "entry_submitted") -> None:
        self.journal.append(
            event,
            symbol=signal.symbol,
            side=signal.side,
            qty=plan.qty,
            entry_price=signal.entry_price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            reward_to_risk=signal.reward_to_risk,
            risk_usd=plan.risk_usd,
            expected_profit_usd=plan.expected_profit_usd,
            order_id=order_id,
            reason=signal.reason,
            metadata=signal.metadata,
        )

    def record_closed_pnls(self, closed_trades: List[Dict[str, Any]]) -> int:
        """Record closed Bybit PnL rows not already present in the journal."""

        if not closed_trades:
            return 0
        data = self.journal.load()
        existing_ids = set(data.loc[data["event"] == "closed", "order_id"].dropna().astype(str)) if not data.empty else set()
        written = 0
        for trade in closed_trades:
            order_id = str(trade.get("order_id") or trade.get("closed_pnl_id") or "")
            if not order_id or order_id in existing_ids:
                continue
            pnl = float(trade.get("closed_pnl", 0.0) or 0.0)
            self.journal.append(
                "closed",
                symbol=trade.get("symbol", self.config.SYMBOL),
                side=trade.get("side", ""),
                qty=trade.get("qty", ""),
                entry_price=trade.get("entry_price", ""),
                order_id=order_id,
                closed_pnl=pnl,
                reason="Position closed on exchange",
                metadata=trade,
            )
            existing_ids.add(order_id)
            written += 1
        return written
