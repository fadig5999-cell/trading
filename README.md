# XAUUSD Smart Money Concepts Expert Advisor

This repository contains a MetaTrader 5 Expert Advisor for XAUUSD (`Gold`) that uses a conservative Smart Money Concepts / ICT-style confluence model on M5 entries with M15 trend confirmation.

## File

- `Experts/XAUUSD_SMC_AI_EA.mq5`

## Strategy model

The EA only evaluates a setup on a new M5 or M15 entry candle. A trade requires all major confluence blocks:

1. Liquidity sweep of recent highs/lows.
2. Break of Structure (BOS) after the sweep.
3. Fair Value Gap (FVG) detection.
4. Order Block detection.
5. M15 EMA and structure trend confirmation.
6. Price trading back into, or touching, the FVG/order block zone.
7. London or New York UTC session filter.
8. High-impact USD news avoidance using the MT5 economic calendar.
9. Minimum 1:2 risk-to-reward.
10. Stop loss beyond recent swing high/low, buffered in points.

The "AI" component is implemented as a deterministic confluence score. It is not a machine-learning model, which keeps live behavior auditable and stable inside MT5.

## Risk controls

- Auto lot sizing from account equity and stop distance.
- Risk per trade is clamped between `0.5%` and `1.0%`.
- Maximum trades per day defaults to `2`.
- Maximum daily loss defaults to `2%`.
- Maximum account drawdown protection defaults to `6%`.
- One open XAUUSD position at a time.
- No martingale.
- No grid.
- No recovery entries.
- No revenge trading after daily loss or daily trade limits.

## Installation

1. Copy `Experts/XAUUSD_SMC_AI_EA.mq5` into your MT5 data folder under `MQL5/Experts/`.
2. Open MetaEditor and compile the file.
3. Attach it to an XAUUSD M5 chart.
4. Enable Algo Trading in MT5.
5. Confirm that your broker symbol name matches the `InpTradeSymbol` input. If your broker uses a suffix, update it, for example `XAUUSDm`.

## Recommended validation before live trading

- Backtest XAUUSD using real ticks.
- Forward test on demo first.
- Check broker-specific symbol digits, tick value, stop level, spread, and execution rules.
- Verify the MT5 economic calendar is available from your terminal and broker environment if `InpUseNewsFilter` is enabled.

This EA is engineering-focused risk software, not financial advice. Live trading remains risky and should be tested carefully before any real-money deployment.
