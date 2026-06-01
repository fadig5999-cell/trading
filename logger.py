from __future__ import annotations

import csv
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping


def setup_logger(name: str = "bybit_btc_bot", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    logger.propagate = False

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(handler)

    return logger


class CSVJournal:
    fieldnames = [
        "timestamp_utc",
        "event",
        "symbol",
        "side",
        "entry",
        "stop_loss",
        "take_profit",
        "quantity",
        "risk_usd",
        "target_profit_usd",
        "rr",
        "status",
        "reason",
        "order_id",
        "pnl_usd",
    ]

    def __init__(self, path: Path) -> None:
        self.path = path
        if self.path.parent != Path("."):
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_header()

    def _ensure_header(self) -> None:
        if self.path.exists() and self.path.stat().st_size > 0:
            return
        with self.path.open("w", newline="", encoding="utf-8") as file_obj:
            writer = csv.DictWriter(file_obj, fieldnames=self.fieldnames)
            writer.writeheader()

    def append(self, event: str, data: Mapping[str, Any]) -> None:
        row = {field: "" for field in self.fieldnames}
        row["timestamp_utc"] = datetime.now(timezone.utc).isoformat()
        row["event"] = event
        for key, value in data.items():
            if key in row:
                row[key] = value
        with self.path.open("a", newline="", encoding="utf-8") as file_obj:
            writer = csv.DictWriter(file_obj, fieldnames=self.fieldnames)
            writer.writerow(row)

    def read_today_stats(self) -> tuple[int, float, int]:
        today = datetime.now(timezone.utc).date().isoformat()
        trades = 0
        pnl_total = 0.0
        consecutive_losses = 0

        if not self.path.exists():
            return trades, pnl_total, consecutive_losses

        rows: list[dict[str, str]] = []
        with self.path.open("r", newline="", encoding="utf-8") as file_obj:
            reader = csv.DictReader(file_obj)
            for row in reader:
                if row.get("timestamp_utc", "").startswith(today):
                    rows.append(row)

        for row in rows:
            if row.get("event") in {"order_submitted", "paper_trade"}:
                trades += 1
            pnl_text = row.get("pnl_usd") or ""
            if pnl_text:
                try:
                    pnl_total += float(pnl_text)
                except ValueError:
                    pass

        for row in reversed(rows):
            pnl_text = row.get("pnl_usd") or ""
            if not pnl_text:
                continue
            try:
                pnl = float(pnl_text)
            except ValueError:
                continue
            if pnl < 0:
                consecutive_losses += 1
            else:
                break

        return trades, pnl_total, consecutive_losses
