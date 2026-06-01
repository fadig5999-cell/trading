from __future__ import annotations

import time
import uuid
from typing import Any, Optional

from config import BotConfig
from risk_manager import InstrumentRules, PositionPlan
from strategy import Candle


class BybitClientError(RuntimeError):
    pass


class BybitClient:
    def __init__(self, config: BotConfig) -> None:
        self.config = config
        try:
            from pybit.unified_trading import HTTP
        except ImportError as exc:
            raise BybitClientError(
                "pybit is not installed. Run: pip install -r requirements.txt"
            ) from exc

        self.session = HTTP(
            testnet=config.testnet,
            api_key=config.api_key,
            api_secret=config.api_secret,
        )

    def _call(self, name: str, **kwargs: Any) -> dict[str, Any]:
        method = getattr(self.session, name)
        last_error: Optional[Exception] = None
        for attempt in range(1, 5):
            try:
                response = method(**kwargs)
                ret_code = response.get("retCode")
                if ret_code not in (0, "0", None):
                    ret_msg = response.get("retMsg", "unknown Bybit error")
                    raise BybitClientError(f"{name} failed: {ret_code} {ret_msg}")
                return response
            except Exception as exc:  # pybit raises broad request exceptions.
                last_error = exc
                if attempt == 4:
                    break
                sleep_seconds = min(2**attempt, 10)
                time.sleep(sleep_seconds)
        raise BybitClientError(f"{name} failed after retries: {last_error}") from last_error

    def test_connection(self) -> dict[str, Any]:
        server_time = self._call("get_server_time")
        result: dict[str, Any] = {
            "server_time": server_time.get("result", {}),
            "testnet": self.config.testnet,
            "authenticated": False,
        }
        if self.config.api_key and self.config.api_secret:
            wallet = self._wallet_balance_response()
            result["authenticated"] = True
            result["wallet"] = wallet.get("result", {})
        return result

    def get_klines(
        self, symbol: str, interval: str, limit: int, drop_latest: bool = True
    ) -> list[Candle]:
        response = self._call(
            "get_kline",
            category=self.config.category,
            symbol=symbol,
            interval=interval,
            limit=limit,
        )
        rows = response.get("result", {}).get("list", [])
        candles = [Candle.from_bybit_kline(row) for row in rows]
        candles.sort(key=lambda candle: candle.timestamp_ms)
        if drop_latest and len(candles) > 1:
            candles = candles[:-1]
        return candles

    def get_spread_bps(self, symbol: str) -> Optional[float]:
        response = self._call(
            "get_tickers", category=self.config.category, symbol=symbol
        )
        tickers = response.get("result", {}).get("list", [])
        if not tickers:
            return None
        ticker = tickers[0]
        bid = float(ticker.get("bid1Price") or 0)
        ask = float(ticker.get("ask1Price") or 0)
        if bid <= 0 or ask <= 0 or ask < bid:
            return None
        mid = (bid + ask) / 2
        return ((ask - bid) / mid) * 10_000

    def get_instrument_rules(self, symbol: str) -> InstrumentRules:
        response = self._call(
            "get_instruments_info", category=self.config.category, symbol=symbol
        )
        instruments = response.get("result", {}).get("list", [])
        if not instruments:
            raise BybitClientError(f"No instrument information found for {symbol}")
        instrument = instruments[0]
        lot_filter = instrument.get("lotSizeFilter", {})
        price_filter = instrument.get("priceFilter", {})
        return InstrumentRules(
            min_order_qty=float(lot_filter.get("minOrderQty", 0.001)),
            qty_step=float(lot_filter.get("qtyStep", 0.001)),
            tick_size=float(price_filter.get("tickSize", 0.1)),
        )

    def get_wallet_equity_usd(self) -> Optional[float]:
        if not self.config.api_key or not self.config.api_secret:
            return None
        response = self._wallet_balance_response()
        accounts = response.get("result", {}).get("list", [])
        if not accounts:
            return None
        account = accounts[0]
        equity_text = account.get("totalEquity")
        if equity_text not in (None, ""):
            return float(equity_text)
        coins = account.get("coin", [])
        for coin in coins:
            if coin.get("coin") == "USDT":
                return float(coin.get("equity") or 0)
        return None

    def _wallet_balance_response(self) -> dict[str, Any]:
        last_error: Optional[Exception] = None
        for account_type in ("UNIFIED", "CONTRACT"):
            try:
                return self._call("get_wallet_balance", accountType=account_type, coin="USDT")
            except Exception as exc:
                last_error = exc
        raise BybitClientError(f"Unable to read wallet balance: {last_error}") from last_error

    def set_leverage(self, symbol: str) -> None:
        if not self.config.api_key or not self.config.api_secret:
            return
        try:
            self._call(
                "set_leverage",
                category=self.config.category,
                symbol=symbol,
                buyLeverage=str(self.config.leverage),
                sellLeverage=str(self.config.leverage),
            )
        except BybitClientError as exc:
            message = str(exc).lower()
            if "not modified" in message or "same leverage" in message:
                return
            raise

    def get_open_position(self, symbol: str) -> Optional[dict[str, Any]]:
        if not self.config.api_key or not self.config.api_secret:
            return None
        response = self._call(
            "get_positions", category=self.config.category, symbol=symbol
        )
        positions = response.get("result", {}).get("list", [])
        for position in positions:
            size = float(position.get("size") or 0)
            if size > 0:
                return position
        return None

    def has_active_order(self, symbol: str) -> bool:
        if not self.config.api_key or not self.config.api_secret:
            return False
        response = self._call(
            "get_open_orders", category=self.config.category, symbol=symbol
        )
        return bool(response.get("result", {}).get("list", []))

    def place_bracket_order(
        self,
        plan: PositionPlan,
        order_type: str = "Market",
        limit_price: Optional[float] = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "category": self.config.category,
            "symbol": plan.signal.symbol,
            "side": plan.signal.side,
            "orderType": order_type,
            "qty": self._format_number(plan.quantity),
            "takeProfit": self._format_number(plan.take_profit),
            "stopLoss": self._format_number(plan.stop_loss),
            "tpslMode": "Full",
            "tpOrderType": "Market",
            "slOrderType": "Market",
            "orderLinkId": f"btcbot-{uuid.uuid4().hex[:20]}",
        }
        if order_type == "Limit":
            if limit_price is None:
                raise BybitClientError("limit_price is required for Limit orders")
            params["price"] = self._format_number(limit_price)
            params["timeInForce"] = "GTC"

        return self._call("place_order", **params)

    @staticmethod
    def _format_number(value: float) -> str:
        text = f"{value:.10f}".rstrip("0").rstrip(".")
        return text if text else "0"
