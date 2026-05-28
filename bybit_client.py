"""Bybit USDT perpetual execution adapter using pybit."""

from __future__ import annotations

import math
import time
import uuid
from decimal import Decimal, ROUND_DOWN
from logging import Logger
from typing import Any, Callable, Dict, List, Optional

import pandas as pd
from pybit.unified_trading import HTTP

from config import BotConfig
from risk_manager import PositionPlan
from strategy import TradeSignal


class BybitAPIError(RuntimeError):
    """Raised when Bybit returns an unrecoverable API error."""


class BybitClient:
    """Small, defensive wrapper around pybit's unified trading HTTP client."""

    def __init__(self, config: BotConfig, logger: Logger) -> None:
        self.config = config
        self.logger = logger
        session_kwargs: Dict[str, Any] = {
            "testnet": config.TESTNET,
            "recv_window": config.HTTP_RECV_WINDOW,
        }
        if config.API_KEY and config.API_SECRET:
            session_kwargs["api_key"] = config.API_KEY
            session_kwargs["api_secret"] = config.API_SECRET
        self.session = HTTP(**session_kwargs)
        self._instrument_cache: Optional[Dict[str, Decimal]] = None

    def _require_credentials(self) -> None:
        self.config.require_api_credentials()

    def _request(self, description: str, func: Callable[..., Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        last_error: Optional[Exception] = None
        for attempt in range(1, 5):
            try:
                response = func(**kwargs)
                ret_code = int(response.get("retCode", 0))
                if ret_code == 0:
                    return response
                message = response.get("retMsg", "Unknown Bybit error")
                if ret_code in {10006, 10016, 10018, 170005} and attempt < 4:
                    sleep_seconds = 2**attempt
                    self.logger.warning(
                        "Bybit rate/transient error during %s: retCode=%s retMsg=%s; retrying in %ss",
                        description,
                        ret_code,
                        message,
                        sleep_seconds,
                    )
                    time.sleep(sleep_seconds)
                    continue
                raise BybitAPIError(f"{description} failed: retCode={ret_code} retMsg={message}")
            except Exception as exc:  # noqa: BLE001 - API/network failures need a common retry path.
                last_error = exc
                if attempt >= 4:
                    break
                sleep_seconds = 2**attempt
                self.logger.warning("%s failed on attempt %s: %s; retrying in %ss", description, attempt, exc, sleep_seconds)
                time.sleep(sleep_seconds)
        raise BybitAPIError(f"{description} failed after retries: {last_error}")

    def get_klines(self, interval: str, limit: Optional[int] = None) -> pd.DataFrame:
        response = self._request(
            f"get {interval} klines",
            self.session.get_kline,
            category=self.config.CATEGORY,
            symbol=self.config.SYMBOL,
            interval=interval,
            limit=limit or self.config.DATA_LIMIT,
        )
        rows = response.get("result", {}).get("list", [])
        records = []
        if not rows:
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
        for row in rows:
            records.append(
                {
                    "timestamp": pd.to_datetime(int(row[0]), unit="ms", utc=True),
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": float(row[5]),
                }
            )
        return pd.DataFrame(records).sort_values("timestamp").reset_index(drop=True)

    def get_instrument_specs(self) -> Dict[str, Decimal]:
        if self._instrument_cache is not None:
            return self._instrument_cache
        response = self._request(
            "get instrument specs",
            self.session.get_instruments_info,
            category=self.config.CATEGORY,
            symbol=self.config.SYMBOL,
        )
        instruments = response.get("result", {}).get("list", [])
        if not instruments:
            raise BybitAPIError(f"No instrument specs returned for {self.config.SYMBOL}")
        instrument = instruments[0]
        lot_filter = instrument.get("lotSizeFilter", {})
        price_filter = instrument.get("priceFilter", {})
        self._instrument_cache = {
            "qty_step": Decimal(str(lot_filter.get("qtyStep", "0.001"))),
            "min_qty": Decimal(str(lot_filter.get("minOrderQty", "0.001"))),
            "min_notional": Decimal(str(lot_filter.get("minNotionalValue", "5"))),
            "tick_size": Decimal(str(price_filter.get("tickSize", "0.1"))),
        }
        return self._instrument_cache

    def _round_down(self, value: float, step: Decimal) -> Decimal:
        decimal_value = Decimal(str(value))
        if step <= 0:
            return decimal_value
        return (decimal_value / step).to_integral_value(rounding=ROUND_DOWN) * step

    def round_price(self, price: float) -> str:
        specs = self.get_instrument_specs()
        rounded = self._round_down(price, specs["tick_size"])
        return format(rounded.normalize(), "f")

    def round_qty(self, qty: float, entry_price: float) -> str:
        specs = self.get_instrument_specs()
        rounded = self._round_down(qty, specs["qty_step"])
        if rounded < specs["min_qty"]:
            raise BybitAPIError(f"Calculated quantity {rounded} is below minimum {specs['min_qty']}")
        if rounded * Decimal(str(entry_price)) < specs["min_notional"]:
            raise BybitAPIError("Calculated order notional is below Bybit minimum")
        return format(rounded.normalize(), "f")

    def set_leverage(self) -> None:
        self._require_credentials()
        leverage = min(self.config.LEVERAGE, self.config.MAX_LEVERAGE)
        try:
            self._request(
                "set leverage",
                self.session.set_leverage,
                category=self.config.CATEGORY,
                symbol=self.config.SYMBOL,
                buyLeverage=str(leverage),
                sellLeverage=str(leverage),
            )
            self.logger.info("Set %sx leverage for %s", leverage, self.config.SYMBOL)
        except BybitAPIError as exc:
            if "not modified" in str(exc).lower() or "110043" in str(exc):
                self.logger.info("Leverage already set to %sx", leverage)
                return
            raise

    def get_wallet_balance(self) -> Optional[float]:
        self._require_credentials()
        response = self._request("get wallet balance", self.session.get_wallet_balance, accountType="UNIFIED", coin="USDT")
        accounts = response.get("result", {}).get("list", [])
        if not accounts:
            return None
        account = accounts[0]
        for key in ("totalAvailableBalance", "totalWalletBalance"):
            value = account.get(key)
            if value not in (None, ""):
                return float(value)
        coins = account.get("coin", [])
        for coin in coins:
            if coin.get("coin") == "USDT":
                for key in ("availableToWithdraw", "walletBalance", "equity"):
                    value = coin.get(key)
                    if value not in (None, ""):
                        return float(value)
        return None

    def get_spread_bps(self) -> Optional[float]:
        response = self._request(
            "get ticker",
            self.session.get_tickers,
            category=self.config.CATEGORY,
            symbol=self.config.SYMBOL,
        )
        tickers = response.get("result", {}).get("list", [])
        if not tickers:
            return None
        ticker = tickers[0]
        bid = float(ticker.get("bid1Price") or 0)
        ask = float(ticker.get("ask1Price") or 0)
        if bid <= 0 or ask <= 0 or ask < bid:
            return None
        midpoint = (ask + bid) / 2
        return ((ask - bid) / midpoint) * 10_000

    def get_open_position(self) -> Optional[Dict[str, Any]]:
        self._require_credentials()
        response = self._request(
            "get open positions",
            self.session.get_positions,
            category=self.config.CATEGORY,
            symbol=self.config.SYMBOL,
        )
        positions = response.get("result", {}).get("list", [])
        for position in positions:
            size = float(position.get("size") or 0)
            if not math.isclose(size, 0.0):
                return position
        return None

    def place_protected_order(self, signal: TradeSignal, plan: PositionPlan) -> Dict[str, Any]:
        self._require_credentials()
        qty = self.round_qty(plan.qty, signal.entry_price)
        stop_loss = self.round_price(signal.stop_loss)
        take_profit = self.round_price(signal.take_profit)
        order_link_id = f"btc-bot-{int(time.time())}-{uuid.uuid4().hex[:8]}"

        order_kwargs: Dict[str, Any] = {
            "category": self.config.CATEGORY,
            "symbol": signal.symbol,
            "side": signal.side,
            "orderType": self.config.ORDER_TYPE,
            "qty": qty,
            "stopLoss": stop_loss,
            "takeProfit": take_profit,
            "slTriggerBy": "LastPrice",
            "tpTriggerBy": "LastPrice",
            "tpslMode": "Full",
            "reduceOnly": False,
            "orderLinkId": order_link_id,
        }
        if self.config.ORDER_TYPE.lower() == "limit":
            order_kwargs["price"] = self.round_price(signal.entry_price)
            order_kwargs["timeInForce"] = "PostOnly" if self.config.POST_ONLY_LIMITS else "GTC"
        else:
            order_kwargs["timeInForce"] = "IOC"

        self.logger.info(
            "Submitting %s %s order qty=%s SL=%s TP=%s RR=%.2f",
            signal.side,
            signal.symbol,
            qty,
            stop_loss,
            take_profit,
            signal.reward_to_risk,
        )
        response = self._request("place protected order", self.session.place_order, **order_kwargs)
        result = response.get("result", {})
        result["orderLinkId"] = order_link_id
        result["qty"] = qty
        result["stopLoss"] = stop_loss
        result["takeProfit"] = take_profit
        return result

    def get_recent_closed_pnl(self, limit: int = 20) -> List[Dict[str, Any]]:
        self._require_credentials()
        response = self._request(
            "get closed pnl",
            self.session.get_closed_pnl,
            category=self.config.CATEGORY,
            symbol=self.config.SYMBOL,
            limit=limit,
        )
        rows = response.get("result", {}).get("list", [])
        normalized: List[Dict[str, Any]] = []
        for row in rows:
            normalized.append(
                {
                    "closed_pnl_id": row.get("orderId") or row.get("createdTime"),
                    "order_id": row.get("orderId") or row.get("createdTime"),
                    "symbol": row.get("symbol", self.config.SYMBOL),
                    "side": row.get("side", ""),
                    "qty": row.get("qty", ""),
                    "entry_price": row.get("avgEntryPrice", ""),
                    "closed_pnl": float(row.get("closedPnl") or 0.0),
                    "created_time": row.get("createdTime", ""),
                    "raw": row,
                }
            )
        return normalized
