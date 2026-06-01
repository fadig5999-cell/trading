from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean value, got {value!r}")


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    return default if value is None or value == "" else int(value)


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    return default if value is None or value == "" else float(value)


def _str_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return default if value is None or value == "" else value.strip()


def _time_env(name: str, default: str) -> time:
    value = _str_env(name, default)
    try:
        hour_text, minute_text = value.split(":", 1)
        return time(hour=int(hour_text), minute=int(minute_text))
    except Exception as exc:
        raise ValueError(f"{name} must use HH:MM format, got {value!r}") from exc


@dataclass(frozen=True)
class BotConfig:
    symbol: str = "BTCUSDT"
    exchange: str = "Bybit"
    category: str = "linear"
    testnet: bool = True
    paper_trading: bool = True
    api_key: Optional[str] = None
    api_secret: Optional[str] = None

    entry_interval: str = "15"
    h1_interval: str = "60"
    h4_interval: str = "240"
    historical_limit: int = 300

    risk_per_trade_usd: float = 10.0
    target_profit_usd: float = 50.0
    minimum_rr: float = 3.0
    max_trades_per_day: int = 2
    max_daily_loss_usd: float = 30.0
    max_consecutive_losses: int = 2
    leverage: float = 2.0
    max_leverage: float = 3.0

    use_atr_filter: bool = True
    atr_period: int = 14
    use_volume_filter: bool = True
    use_session_filter: bool = True
    session_start: time = time(hour=7, minute=0)
    session_end: time = time(hour=23, minute=0)
    max_spread_bps: float = 5.0
    max_atr_multiplier: float = 2.5
    min_atr_pct: float = 0.0008
    volume_lookback: int = 20
    min_volume_multiplier: float = 0.8

    enable_long_trades: bool = True
    enable_short_trades: bool = True

    poll_interval_seconds: int = 60
    journal_path: Path = Path("trade_journal.csv")
    log_level: str = "INFO"

    order_type: str = "Market"
    limit_order_offset_bps: float = 1.0

    @classmethod
    def from_env(cls, env_file: str | Path = ".env") -> "BotConfig":
        load_dotenv(env_file, override=False)
        config = cls(
            symbol=_str_env("SYMBOL", cls.symbol).upper(),
            exchange=_str_env("EXCHANGE", cls.exchange),
            category=_str_env("CATEGORY", cls.category),
            testnet=_bool_env("TESTNET", cls.testnet),
            paper_trading=_bool_env("PAPER_TRADING", cls.paper_trading),
            api_key=os.getenv("BYBIT_API_KEY") or None,
            api_secret=os.getenv("BYBIT_API_SECRET") or None,
            entry_interval=_str_env("ENTRY_INTERVAL", cls.entry_interval),
            h1_interval=_str_env("H1_INTERVAL", cls.h1_interval),
            h4_interval=_str_env("H4_INTERVAL", cls.h4_interval),
            historical_limit=_int_env("HISTORICAL_LIMIT", cls.historical_limit),
            risk_per_trade_usd=_float_env("RISK_PER_TRADE_USD", cls.risk_per_trade_usd),
            target_profit_usd=_float_env("TARGET_PROFIT_USD", cls.target_profit_usd),
            minimum_rr=_float_env("MINIMUM_RR", cls.minimum_rr),
            max_trades_per_day=_int_env("MAX_TRADES_PER_DAY", cls.max_trades_per_day),
            max_daily_loss_usd=_float_env("MAX_DAILY_LOSS_USD", cls.max_daily_loss_usd),
            max_consecutive_losses=_int_env(
                "MAX_CONSECUTIVE_LOSSES", cls.max_consecutive_losses
            ),
            leverage=_float_env("LEVERAGE", cls.leverage),
            max_leverage=_float_env("MAX_LEVERAGE", cls.max_leverage),
            use_atr_filter=_bool_env("USE_ATR_FILTER", cls.use_atr_filter),
            atr_period=_int_env("ATR_PERIOD", cls.atr_period),
            use_volume_filter=_bool_env("USE_VOLUME_FILTER", cls.use_volume_filter),
            use_session_filter=_bool_env("USE_SESSION_FILTER", cls.use_session_filter),
            session_start=_time_env("SESSION_START", "07:00"),
            session_end=_time_env("SESSION_END", "23:00"),
            max_spread_bps=_float_env("MAX_SPREAD_BPS", cls.max_spread_bps),
            max_atr_multiplier=_float_env("MAX_ATR_MULTIPLIER", cls.max_atr_multiplier),
            min_atr_pct=_float_env("MIN_ATR_PCT", cls.min_atr_pct),
            volume_lookback=_int_env("VOLUME_LOOKBACK", cls.volume_lookback),
            min_volume_multiplier=_float_env(
                "MIN_VOLUME_MULTIPLIER", cls.min_volume_multiplier
            ),
            enable_long_trades=_bool_env("ENABLE_LONG_TRADES", cls.enable_long_trades),
            enable_short_trades=_bool_env("ENABLE_SHORT_TRADES", cls.enable_short_trades),
            poll_interval_seconds=_int_env(
                "POLL_INTERVAL_SECONDS", cls.poll_interval_seconds
            ),
            journal_path=Path(_str_env("JOURNAL_PATH", str(cls.journal_path))),
            log_level=_str_env("LOG_LEVEL", cls.log_level).upper(),
            order_type=_str_env("ORDER_TYPE", cls.order_type),
            limit_order_offset_bps=_float_env(
                "LIMIT_ORDER_OFFSET_BPS", cls.limit_order_offset_bps
            ),
        )
        config.validate()
        return config

    def validate(self) -> None:
        if self.exchange.lower() != "bybit":
            raise ValueError("This bot currently supports EXCHANGE=Bybit only")
        if self.category != "linear":
            raise ValueError("BTCUSDT USDT perpetual trading requires CATEGORY=linear")
        if self.risk_per_trade_usd <= 0:
            raise ValueError("RISK_PER_TRADE_USD must be greater than zero")
        if self.target_profit_usd <= 0:
            raise ValueError("TARGET_PROFIT_USD must be greater than zero")
        if self.minimum_rr < 3:
            raise ValueError("MINIMUM_RR must be at least 3 for this system")
        if self.max_trades_per_day < 1:
            raise ValueError("MAX_TRADES_PER_DAY must be at least 1")
        if self.max_daily_loss_usd < self.risk_per_trade_usd:
            raise ValueError("MAX_DAILY_LOSS_USD must be at least one trade risk")
        if self.max_consecutive_losses < 1:
            raise ValueError("MAX_CONSECUTIVE_LOSSES must be at least 1")
        if self.leverage <= 0:
            raise ValueError("LEVERAGE must be greater than zero")
        if self.max_leverage <= 0:
            raise ValueError("MAX_LEVERAGE must be greater than zero")
        if self.leverage > self.max_leverage:
            raise ValueError("LEVERAGE cannot exceed MAX_LEVERAGE")
        if self.max_leverage > 5:
            raise ValueError("MAX_LEVERAGE is intentionally capped at 5 or below")
        if self.atr_period < 2:
            raise ValueError("ATR_PERIOD must be at least 2")
        if self.historical_limit < 220:
            raise ValueError("HISTORICAL_LIMIT must be at least 220 for EMA 200")
        if self.poll_interval_seconds < 10:
            raise ValueError("POLL_INTERVAL_SECONDS should be at least 10 seconds")
        if self.order_type not in {"Market", "Limit"}:
            raise ValueError("ORDER_TYPE must be Market or Limit")
        if not self.paper_trading and (not self.api_key or not self.api_secret):
            raise ValueError(
                "BYBIT_API_KEY and BYBIT_API_SECRET are required when PAPER_TRADING=false"
            )

    @property
    def desired_profit_rr(self) -> float:
        return max(self.minimum_rr, self.target_profit_usd / self.risk_per_trade_usd)

    @property
    def credential_state(self) -> str:
        if self.api_key and self.api_secret:
            return "configured"
        return "missing"
