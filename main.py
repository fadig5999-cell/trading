"""Entrypoint for the Bybit BTCUSDT automated trading bot."""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timezone
from logging import Logger
from typing import Optional

from bybit_client import BybitAPIError, BybitClient
from config import BotConfig, load_config
from logger import setup_logger
from risk_manager import RiskManager, TradeJournal
from strategy import StrategyDecision, generate_signal


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bybit BTCUSDT trend/liquidity trading bot")
    parser.add_argument("--once", action="store_true", help="Run one strategy cycle and exit")
    parser.add_argument("--paper", action="store_true", help="Generate paper entries without placing exchange orders")
    return parser.parse_args()


def _guard_live_trading(config: BotConfig) -> None:
    if config.TESTNET or config.PAPER_TRADING:
        return
    confirmation = os.getenv("LIVE_TRADING_CONFIRMATION", "")
    if confirmation != "I_UNDERSTAND_THE_RISK":
        raise RuntimeError(
            "Live trading is blocked. Set TESTNET=true until backtesting and testnet trading pass. "
            "To intentionally trade live, set LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_THE_RISK."
        )


def _get_open_position(client: BybitClient, config: BotConfig, logger: Logger) -> Optional[dict]:
    if config.PAPER_TRADING:
        return None
    try:
        return client.get_open_position()
    except RuntimeError as exc:
        logger.warning("Could not check open position; skipping this cycle for safety: %s", exc)
        raise


def _sync_closed_pnl(client: BybitClient, risk_manager: RiskManager, config: BotConfig, logger: Logger) -> None:
    if config.PAPER_TRADING:
        return
    try:
        written = risk_manager.record_closed_pnls(client.get_recent_closed_pnl())
        if written:
            logger.info("Recorded %s newly closed trade(s) from Bybit PnL history", written)
    except RuntimeError as exc:
        logger.warning("Could not sync closed PnL this cycle: %s", exc)


def _fetch_signal_decision(client: BybitClient, config: BotConfig) -> StrategyDecision:
    entry_df = client.get_klines(config.ENTRY_TIMEFRAME, config.DATA_LIMIT)
    h1_df = client.get_klines(config.H1_TIMEFRAME, config.DATA_LIMIT)
    h4_df = client.get_klines(config.H4_TIMEFRAME, config.DATA_LIMIT)
    return generate_signal(entry_df=entry_df, h1_df=h1_df, h4_df=h4_df, config=config)


def run_once(client: BybitClient, risk_manager: RiskManager, config: BotConfig, logger: Logger) -> None:
    logger.info("Starting strategy cycle for %s on %s", config.SYMBOL, "testnet" if config.TESTNET else "live")
    _sync_closed_pnl(client, risk_manager, config, logger)

    open_position = _get_open_position(client, config, logger)
    if open_position:
        logger.info("Existing position found; no new entry will be submitted: %s", open_position)
        return

    spread_bps = client.get_spread_bps()
    if spread_bps is None:
        logger.warning("Spread could not be read; skipping entry for safety")
        return
    if spread_bps > config.MAX_SPREAD_BPS:
        logger.info("Spread %.2fbps exceeds max %.2fbps; skipping", spread_bps, config.MAX_SPREAD_BPS)
        risk_manager.record_signal_skip(None, "Spread too wide", {"spread_bps": spread_bps})
        return

    decision = _fetch_signal_decision(client, config)
    if not decision.signal:
        logger.info("No trade: %s | diagnostics=%s", decision.reason, decision.diagnostics)
        return

    wallet_balance = None if config.PAPER_TRADING else client.get_wallet_balance()
    risk_decision = risk_manager.can_enter_trade(
        signal=decision.signal,
        wallet_balance_usd=wallet_balance,
        has_open_position=False,
    )
    if not risk_decision.allowed or not risk_decision.plan:
        logger.info("Signal rejected by risk manager: %s", risk_decision.reason)
        risk_manager.record_signal_skip(decision.signal, risk_decision.reason, decision.diagnostics)
        return

    logger.info(
        "Approved %s signal entry=%.2f SL=%.2f TP=%.2f RR=%.2f risk=$%.2f expected_profit=$%.2f",
        decision.signal.side,
        decision.signal.entry_price,
        decision.signal.stop_loss,
        decision.signal.take_profit,
        decision.signal.reward_to_risk,
        risk_decision.plan.risk_usd,
        risk_decision.plan.expected_profit_usd,
    )

    if config.PAPER_TRADING:
        paper_id = f"paper-{int(datetime.now(timezone.utc).timestamp())}"
        risk_manager.record_entry(decision.signal, risk_decision.plan, paper_id, event="paper_entry")
        logger.info("Paper entry recorded; no exchange order was placed")
        return

    order_result = client.place_protected_order(decision.signal, risk_decision.plan)
    order_id = str(order_result.get("orderId") or order_result.get("orderLinkId") or "")
    risk_manager.record_entry(decision.signal, risk_decision.plan, order_id)
    logger.info("Order submitted successfully: %s", order_result)


def main() -> int:
    args = _parse_args()
    config = load_config()
    if args.paper:
        config = BotConfig(**{**config.__dict__, "PAPER_TRADING": True})

    logger = setup_logger(config.LOG_PATH)
    logger.info("Loaded config: symbol=%s testnet=%s paper=%s leverage=%sx", config.SYMBOL, config.TESTNET, config.PAPER_TRADING, config.LEVERAGE)
    _guard_live_trading(config)

    journal = TradeJournal(config.JOURNAL_PATH)
    risk_manager = RiskManager(config, journal)
    client = BybitClient(config, logger)
    if not config.PAPER_TRADING:
        client.set_leverage()

    while True:
        try:
            run_once(client, risk_manager, config, logger)
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
            return 0
        except BybitAPIError as exc:
            logger.error("Bybit API error; cycle skipped safely: %s", exc)
        except Exception as exc:  # noqa: BLE001 - main loop must stay alive through transient failures.
            logger.exception("Unexpected error; cycle skipped safely: %s", exc)

        if args.once:
            break
        time.sleep(config.LOOP_SECONDS)
    return 0


if __name__ == "__main__":
    sys.exit(main())
