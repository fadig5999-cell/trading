from __future__ import annotations

import argparse
import json
import signal
import sys
import time
from dataclasses import replace
from datetime import datetime, timezone
from typing import Optional

from bybit_client import BybitClient, BybitClientError
from config import BotConfig
from logger import CSVJournal, setup_logger
from risk_manager import PositionPlan, RiskManager
from strategy import StrategyResult, generate_signal


class ShutdownRequested(Exception):
    pass


def _handle_shutdown(_signum: int, _frame: object) -> None:
    raise ShutdownRequested


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BTCUSDT Bybit testnet-first liquidity/trend trading bot"
    )
    parser.add_argument(
        "--validate-connection",
        action="store_true",
        help="Validate Bybit public connectivity and authenticated wallet access if keys are set.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one strategy evaluation cycle and exit.",
    )
    parser.add_argument(
        "--paper",
        action="store_true",
        help="Force paper mode regardless of PAPER_TRADING in .env.",
    )
    parser.add_argument(
        "--execute-testnet",
        action="store_true",
        help="Allow real order placement on Bybit testnet. Requires TESTNET=true and credentials.",
    )
    return parser.parse_args()


def apply_cli_overrides(config: BotConfig, args: argparse.Namespace) -> BotConfig:
    if args.paper:
        config = replace(config, paper_trading=True)
    if args.execute_testnet:
        if not config.testnet:
            raise ValueError("--execute-testnet may only be used with TESTNET=true")
        config = replace(config, paper_trading=False)
        config.validate()
    return config


def main() -> int:
    args = parse_args()
    config = apply_cli_overrides(BotConfig.from_env(), args)
    log = setup_logger(level=config.log_level)
    journal = CSVJournal(config.journal_path)

    log.info(
        "Starting bot | symbol=%s testnet=%s paper_trading=%s credentials=%s",
        config.symbol,
        config.testnet,
        config.paper_trading,
        config.credential_state,
    )

    try:
        client = BybitClient(config)
        if args.validate_connection:
            result = client.test_connection()
            log.info("Bybit connection validation succeeded")
            print(json.dumps(result, indent=2, default=str))
            return 0

        risk_manager = RiskManager(config, journal)
        if args.once:
            evaluate_once(config, client, risk_manager, journal, log, last_signal_key=None)
            return 0
        run_forever(config, client, risk_manager, journal, log)
        return 0
    except (BybitClientError, ValueError) as exc:
        log.error("Fatal startup/runtime error: %s", exc)
        return 1
    except ShutdownRequested:
        log.info("Shutdown requested")
        return 0


def run_forever(
    config: BotConfig,
    client: BybitClient,
    risk_manager: RiskManager,
    journal: CSVJournal,
    log,
) -> None:
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)
    last_signal_key: Optional[str] = None

    while True:
        last_signal_key = evaluate_once(
            config, client, risk_manager, journal, log, last_signal_key=last_signal_key
        )
        time.sleep(config.poll_interval_seconds)


def evaluate_once(
    config: BotConfig,
    client: BybitClient,
    risk_manager: RiskManager,
    journal: CSVJournal,
    log,
    last_signal_key: Optional[str],
) -> Optional[str]:
    try:
        spread_bps = client.get_spread_bps(config.symbol)
        entry_candles = client.get_klines(
            config.symbol, config.entry_interval, config.historical_limit
        )
        h1_candles = client.get_klines(
            config.symbol, config.h1_interval, config.historical_limit
        )
        h4_candles = client.get_klines(
            config.symbol, config.h4_interval, config.historical_limit
        )
        result = generate_signal(
            config.symbol,
            entry_candles,
            h1_candles,
            h4_candles,
            config,
            spread_bps=spread_bps,
            now_utc=datetime.now(timezone.utc),
        )
        if result.signal is None:
            log.info("No trade: %s", result.reason)
            journal.append(
                "signal_rejected",
                {"symbol": config.symbol, "status": "rejected", "reason": result.reason},
            )
            return last_signal_key

        signal_key = _signal_key(result)
        if signal_key == last_signal_key:
            log.info("Duplicate signal skipped: %s", signal_key)
            journal.append(
                "signal_rejected",
                {
                    "symbol": config.symbol,
                    "side": result.signal.side,
                    "status": "duplicate",
                    "reason": "same closed candle signal already processed",
                },
            )
            return last_signal_key

        allowed, reason = risk_manager.trading_allowed()
        if not allowed:
            log.warning("Risk gate blocked trade: %s", reason)
            journal.append(
                "risk_rejected",
                {
                    "symbol": config.symbol,
                    "side": result.signal.side,
                    "entry": result.signal.entry,
                    "stop_loss": result.signal.stop_loss,
                    "take_profit": result.signal.take_profit,
                    "rr": round(result.signal.rr, 2),
                    "status": "blocked",
                    "reason": reason,
                },
            )
            return signal_key

        if not config.paper_trading:
            open_position = client.get_open_position(config.symbol)
            if open_position is not None:
                reason = f"open position exists: {open_position.get('side')} size={open_position.get('size')}"
                log.warning("Trade blocked: %s", reason)
                journal.append(
                    "risk_rejected",
                    {
                        "symbol": config.symbol,
                        "side": result.signal.side,
                        "status": "blocked",
                        "reason": reason,
                    },
                )
                return signal_key
            if client.has_active_order(config.symbol):
                log.warning("Trade blocked: active order exists for %s", config.symbol)
                journal.append(
                    "risk_rejected",
                    {
                        "symbol": config.symbol,
                        "side": result.signal.side,
                        "status": "blocked",
                        "reason": "active order already exists",
                    },
                )
                return signal_key
            client.set_leverage(config.symbol)

        plan = build_plan(config, client, risk_manager, result, log)
        if plan is None:
            return signal_key

        if config.paper_trading:
            log.info(
                "Paper trade accepted | side=%s qty=%s entry=%.2f sl=%.2f tp=%.2f rr=%.2f risk=%.2f target=%.2f",
                plan.signal.side,
                plan.quantity,
                plan.entry,
                plan.stop_loss,
                plan.take_profit,
                plan.rr,
                plan.planned_risk_usd,
                plan.planned_profit_usd,
            )
            journal.append("paper_trade", _journal_data(plan, "paper", "paper mode"))
            return signal_key

        response = submit_order(config, client, plan)
        order_id = (
            response.get("result", {}).get("orderId")
            or response.get("result", {}).get("orderLinkId")
            or ""
        )
        log.info("Order submitted with attached SL/TP | order_id=%s", order_id)
        data = _journal_data(plan, "submitted", "order submitted")
        data["order_id"] = order_id
        journal.append("order_submitted", data)
        return signal_key
    except BybitClientError as exc:
        log.error("Bybit API cycle failed: %s", exc)
        journal.append(
            "error",
            {"symbol": config.symbol, "status": "api_error", "reason": str(exc)},
        )
        return last_signal_key
    except Exception as exc:
        log.exception("Unexpected cycle failure: %s", exc)
        journal.append(
            "error",
            {"symbol": config.symbol, "status": "unexpected_error", "reason": str(exc)},
        )
        return last_signal_key


def build_plan(
    config: BotConfig,
    client: BybitClient,
    risk_manager: RiskManager,
    result: StrategyResult,
    log,
) -> Optional[PositionPlan]:
    if result.signal is None:
        return None
    rules = client.get_instrument_rules(config.symbol)
    equity = client.get_wallet_equity_usd() if not config.paper_trading else None
    plan, reason = risk_manager.build_position_plan(result.signal, rules, equity)
    if plan is None:
        log.warning("Risk manager rejected signal: %s", reason)
        return None
    log.info("Risk manager accepted signal: %s", reason)
    return plan


def submit_order(config: BotConfig, client: BybitClient, plan: PositionPlan) -> dict:
    limit_price: Optional[float] = None
    if config.order_type == "Limit":
        offset = config.limit_order_offset_bps / 10_000
        if plan.signal.direction == "long":
            limit_price = plan.entry * (1 - offset)
        else:
            limit_price = plan.entry * (1 + offset)
    return client.place_bracket_order(
        plan, order_type=config.order_type, limit_price=limit_price
    )


def _signal_key(result: StrategyResult) -> Optional[str]:
    if result.signal is None:
        return None
    candle_timestamp = result.signal.metadata.get("entry_timestamp_ms", "")
    return f"{result.signal.symbol}:{result.signal.direction}:{candle_timestamp}:{round(result.signal.entry, 1)}"


def _journal_data(plan: PositionPlan, status: str, reason: str) -> dict:
    return {
        "symbol": plan.signal.symbol,
        "side": plan.signal.side,
        "entry": plan.entry,
        "stop_loss": plan.stop_loss,
        "take_profit": plan.take_profit,
        "quantity": plan.quantity,
        "risk_usd": round(plan.planned_risk_usd, 2),
        "target_profit_usd": round(plan.planned_profit_usd, 2),
        "rr": round(plan.rr, 2),
        "status": status,
        "reason": reason,
    }


if __name__ == "__main__":
    sys.exit(main())
