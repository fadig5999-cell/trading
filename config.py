"""Configuration loading and validation for the Bybit BTCUSDT bot."""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import time
from typing import Optional

from dotenv import load_dotenv


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    return default if value is None or value == "" else float(value)


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    return default if value is None or value == "" else int(value)


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return default if value is None or value == "" else value


def _parse_hhmm(value: str) -> time:
    hour_text, minute_text = value.split(":", maxsplit=1)
    return time(hour=int(hour_text), minute=int(minute_text))


@dataclass(frozen=True)
class BotConfig:
    """Runtime settings with conservative, testnet-first defaults."""

    SYMBOL: str = "BTCUSDT"
    EXCHANGE: str = "Bybit"
    TESTNET: bool = True
    PAPER_TRADING: bool = False
    CATEGORY: str = "linear"

    API_KEY: Optional[str] = None
    API_SECRET: Optional[str] = None

    RISK_PER_TRADE_USD: float = 10.0
    TARGET_PROFIT_USD: float = 50.0
    MINIMUM_RR: float = 3.0
    MAX_TRADES_PER_DAY: int = 2
    MAX_DAILY_LOSS_USD: float = 30.0
    MAX_CONSECUTIVE_LOSSES: int = 2

    USE_ATR_FILTER: bool = True
    ATR_PERIOD: int = 14
    USE_VOLUME_FILTER: bool = True
    USE_SESSION_FILTER: bool = True
    SESSION_START: str = "07:00"
    SESSION_END: str = "23:00"

    ENABLE_LONG_TRADES: bool = True
    ENABLE_SHORT_TRADES: bool = True
    LEVERAGE: int = 2
    MAX_LEVERAGE: int = 5

    ENTRY_TIMEFRAME: str = "15"
    H1_TIMEFRAME: str = "60"
    H4_TIMEFRAME: str = "240"
    DATA_LIMIT: int = 300
    LOOP_SECONDS: int = 60

    ORDER_TYPE: str = "Market"
    POST_ONLY_LIMITS: bool = False
    MIN_ATR_PCT: float = 0.0005
    MAX_ATR_PCT: float = 0.018
    MAX_SPREAD_BPS: float = 5.0
    SLIPPAGE_BUFFER_BPS: float = 2.0
    MIN_VOLUME_RATIO: float = 0.80
    VOLUME_SMA_PERIOD: int = 20

    JOURNAL_PATH: str = "trades_journal.csv"
    LOG_PATH: str = "bot.log"
    HTTP_RECV_WINDOW: int = 10_000

    def __post_init__(self) -> None:
        if self.EXCHANGE.lower() != "bybit":
            raise ValueError("This bot is implemented for Bybit only.")
        if self.SYMBOL != "BTCUSDT":
            raise ValueError("This strategy is configured for BTCUSDT only.")
        if self.RISK_PER_TRADE_USD <= 0:
            raise ValueError("RISK_PER_TRADE_USD must be greater than zero.")
        if self.TARGET_PROFIT_USD <= 0:
            raise ValueError("TARGET_PROFIT_USD must be greater than zero.")
        if self.MINIMUM_RR < 3:
            raise ValueError("MINIMUM_RR must be at least 3 for this risk model.")
        if self.MAX_TRADES_PER_DAY < 1:
            raise ValueError("MAX_TRADES_PER_DAY must be at least 1.")
        if self.MAX_DAILY_LOSS_USD < self.RISK_PER_TRADE_USD:
            raise ValueError("MAX_DAILY_LOSS_USD should be at least one full trade risk.")
        if self.MAX_CONSECUTIVE_LOSSES < 1:
            raise ValueError("MAX_CONSECUTIVE_LOSSES must be at least 1.")
        if self.ATR_PERIOD < 2:
            raise ValueError("ATR_PERIOD must be at least 2.")
        if self.LEVERAGE < 1:
            raise ValueError("LEVERAGE must be at least 1.")
        if self.MAX_LEVERAGE < 1:
            raise ValueError("MAX_LEVERAGE must be at least 1.")
        if self.LEVERAGE > self.MAX_LEVERAGE:
            raise ValueError("LEVERAGE cannot exceed MAX_LEVERAGE.")
        if self.DATA_LIMIT < 220:
            raise ValueError("DATA_LIMIT must be at least 220 for EMA 200 calculations.")
        _parse_hhmm(self.SESSION_START)
        _parse_hhmm(self.SESSION_END)

    @property
    def session_start_time(self) -> time:
        return _parse_hhmm(self.SESSION_START)

    @property
    def session_end_time(self) -> time:
        return _parse_hhmm(self.SESSION_END)

    @property
    def live_trading_enabled(self) -> bool:
        return not self.TESTNET

    def require_api_credentials(self) -> None:
        if not self.API_KEY or not self.API_SECRET:
            raise RuntimeError(
                "BYBIT_API_KEY and BYBIT_API_SECRET must be set in the environment "
                "or .env file before connecting to Bybit."
            )


def load_config() -> BotConfig:
    """Load .env values and return a validated BotConfig instance."""

    load_dotenv()
    return BotConfig(
        SYMBOL=_env_str("SYMBOL", "BTCUSDT"),
        EXCHANGE=_env_str("EXCHANGE", "Bybit"),
        TESTNET=_env_bool("TESTNET", True),
        PAPER_TRADING=_env_bool("PAPER_TRADING", False),
        CATEGORY=_env_str("CATEGORY", "linear"),
        API_KEY=os.getenv("BYBIT_API_KEY") or os.getenv("API_KEY"),
        API_SECRET=os.getenv("BYBIT_API_SECRET") or os.getenv("API_SECRET"),
        RISK_PER_TRADE_USD=_env_float("RISK_PER_TRADE_USD", 10.0),
        TARGET_PROFIT_USD=_env_float("TARGET_PROFIT_USD", 50.0),
        MINIMUM_RR=_env_float("MINIMUM_RR", 3.0),
        MAX_TRADES_PER_DAY=_env_int("MAX_TRADES_PER_DAY", 2),
        MAX_DAILY_LOSS_USD=_env_float("MAX_DAILY_LOSS_USD", 30.0),
        MAX_CONSECUTIVE_LOSSES=_env_int("MAX_CONSECUTIVE_LOSSES", 2),
        USE_ATR_FILTER=_env_bool("USE_ATR_FILTER", True),
        ATR_PERIOD=_env_int("ATR_PERIOD", 14),
        USE_VOLUME_FILTER=_env_bool("USE_VOLUME_FILTER", True),
        USE_SESSION_FILTER=_env_bool("USE_SESSION_FILTER", True),
        SESSION_START=_env_str("SESSION_START", "07:00"),
        SESSION_END=_env_str("SESSION_END", "23:00"),
        ENABLE_LONG_TRADES=_env_bool("ENABLE_LONG_TRADES", True),
        ENABLE_SHORT_TRADES=_env_bool("ENABLE_SHORT_TRADES", True),
        LEVERAGE=_env_int("LEVERAGE", 2),
        MAX_LEVERAGE=_env_int("MAX_LEVERAGE", 5),
        ENTRY_TIMEFRAME=_env_str("ENTRY_TIMEFRAME", "15"),
        H1_TIMEFRAME=_env_str("H1_TIMEFRAME", "60"),
        H4_TIMEFRAME=_env_str("H4_TIMEFRAME", "240"),
        DATA_LIMIT=_env_int("DATA_LIMIT", 300),
        LOOP_SECONDS=_env_int("LOOP_SECONDS", 60),
        ORDER_TYPE=_env_str("ORDER_TYPE", "Market"),
        POST_ONLY_LIMITS=_env_bool("POST_ONLY_LIMITS", False),
        MIN_ATR_PCT=_env_float("MIN_ATR_PCT", 0.0005),
        MAX_ATR_PCT=_env_float("MAX_ATR_PCT", 0.018),
        MAX_SPREAD_BPS=_env_float("MAX_SPREAD_BPS", 5.0),
        SLIPPAGE_BUFFER_BPS=_env_float("SLIPPAGE_BUFFER_BPS", 2.0),
        MIN_VOLUME_RATIO=_env_float("MIN_VOLUME_RATIO", 0.80),
        VOLUME_SMA_PERIOD=_env_int("VOLUME_SMA_PERIOD", 20),
        JOURNAL_PATH=_env_str("JOURNAL_PATH", "trades_journal.csv"),
        LOG_PATH=_env_str("LOG_PATH", "bot.log"),
        HTTP_RECV_WINDOW=_env_int("HTTP_RECV_WINDOW", 10_000),
    )
