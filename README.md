# BTCUSDT Bybit Testnet Trading Bot

Professional Python trading bot for BTCUSDT on Bybit USDT perpetual futures.
The bot is testnet-first, supports paper mode, uses environment variables for
credentials, and applies fixed-dollar risk controls before any order is placed.

## Safety notice

This software does not guarantee profit. A 65%-70% win-rate target or
$50-$100 target profit per trade can only be evaluated after robust
backtesting, forward testing, and exchange testnet validation. Crypto futures
are high risk. Never trade live until the strategy has passed historical tests,
paper trading, and Bybit testnet execution under your own review.

The repository intentionally does not store real API keys. If credentials were
shared in chat or any ticketing system, rotate them before live use.

## Strategy logic

The bot combines trend-following with liquidity concepts:

1. **Higher timeframe trend filter**
   - Uses H1 and H4 candles.
   - EMA 50 must be above EMA 200 and price above EMA 50 for long bias.
   - EMA 50 must be below EMA 200 and price below EMA 50 for short bias.
   - H1 and H4 must agree. If they conflict, no trade.

2. **Entry timeframe**
   - Default entry timeframe is M15 (`ENTRY_INTERVAL=15`).
   - M5 can be used by setting `ENTRY_INTERVAL=5`, but it is usually noisier.

3. **Liquidity and market-structure confirmation**
   - Detects a recent sweep of a pivot low for longs or pivot high for shorts.
   - Requires a break of structure/change of character after the sweep.
   - Requires a nearby fair value gap so the bot avoids chasing extended
     candles.
   - Detects a simple order block area for metadata and review.
   - Requires discount pricing for longs and premium pricing for shorts based
     on the recent dealing range.

4. **Volatility, volume, spread, and session filters**
   - ATR must be high enough to justify a trade but not abnormally spiking.
   - Current volume must be acceptable versus recent average volume.
   - Spread must be below the configured basis-point threshold.
   - Default trading session is 07:00-23:00 UTC.

5. **Trade construction**
   - Entry uses the latest closed candle close for signal evaluation.
   - Stop loss is placed beyond the swept liquidity level with an ATR buffer.
   - Take profit is set from required RR. With $10 risk and a $50 target, the
     desired RR is 5R. The minimum allowed RR is 3R.

## Why this can work on BTCUSDT

BTCUSDT perpetual futures usually have deep liquidity, tight spreads, and clear
intraday trend phases. Liquidity sweeps around prior highs/lows are common on
BTC because leveraged participants cluster stops around obvious levels. The
bot tries to avoid guessing reversals by requiring both higher timeframe trend
alignment and lower timeframe structure confirmation.

This does not make the strategy risk-free. BTC can gap, trend violently,
mean-revert sharply, and slip during news or liquidation events. The risk model
is therefore more important than any single entry pattern.

## Risk model

Defaults:

- `RISK_PER_TRADE_USD=10`
- `TARGET_PROFIT_USD=50`
- `MINIMUM_RR=3`
- `MAX_TRADES_PER_DAY=2`
- `MAX_DAILY_LOSS_USD=30`
- `MAX_CONSECUTIVE_LOSSES=2`
- `LEVERAGE=2`
- `MAX_LEVERAGE=3`

Position size is calculated as:

```text
quantity_btc = risk_per_trade_usd / abs(entry_price - stop_loss_price)
```

The risk manager rounds quantity and prices to Bybit instrument rules, rejects
orders below minimum size, rejects rounded RR below the minimum, checks daily
trade/loss limits, and blocks trading after too many consecutive losses. It
does not use martingale, grid, recovery sizing, revenge trading, or position
increases after losses.

### Why $50-$100 profit with $10 risk cannot be guaranteed

With $10 planned risk, a $50 target requires a 5R winner and a $100 target
requires a 10R winner. Those opportunities exist only when market structure,
volatility, and liquidity allow enough room. The bot can require high RR before
entering, but it cannot force the market to reach target or prevent slippage.

## Project files

- `main.py` - runtime entrypoint, loop, validation mode, order flow.
- `config.py` - environment-driven configuration and validation.
- `strategy.py` - pure, backtest-ready signal logic.
- `risk_manager.py` - risk gates, sizing, exchange rounding.
- `bybit_client.py` - pybit/Bybit API wrapper.
- `logger.py` - console logging and CSV journal.
- `requirements.txt` - Python dependencies.
- `.env.example` - safe local configuration template.

## Installation

Use Python 3.10 or newer.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` locally. Do not commit it.

## Bybit testnet setup

1. Open the Bybit testnet site.
2. Create or log in to a testnet account.
3. Add testnet funds from the faucet if available.
4. Create API keys on testnet, not live Bybit.
5. Use these permissions:
   - Read account/wallet/positions.
   - Trade derivatives/USDT perpetuals.
   - Do not enable withdrawal permissions.
6. If possible, restrict the API key to your IP.
7. Put the keys only in local `.env`:

```bash
BYBIT_API_KEY=your_testnet_api_key
BYBIT_API_SECRET=your_testnet_api_secret
TESTNET=true
PAPER_TRADING=true
```

Keep `PAPER_TRADING=true` for first runs. To place real testnet orders, set
valid testnet credentials and run with `--execute-testnet`.

## Validate connection

Public connectivity works without credentials. Authenticated wallet validation
requires keys in `.env`.

```bash
python main.py --validate-connection
```

## Run one paper evaluation

```bash
python main.py --once --paper
```

The bot will fetch Bybit testnet market data, evaluate the setup, and write a
CSV row to `trade_journal.csv`.

## Run continuously in paper mode

```bash
python main.py --paper
```

## Place orders on Bybit testnet

Only do this after paper mode behaves correctly.

```bash
TESTNET=true PAPER_TRADING=false python main.py --execute-testnet
```

Every submitted order uses Bybit bracket parameters with stop loss and take
profit attached. The bot also checks for existing positions and active orders
before entering.

## Backtesting and paper trading

The strategy logic in `strategy.py` is pure and accepts lists of `Candle`
objects, so historical backtests can call `generate_signal()` bar-by-bar using
saved Bybit kline data. A proper backtest should include:

- Exchange fees and funding assumptions.
- Slippage assumptions for market orders.
- Limit-order fill rules if using `ORDER_TYPE=Limit`.
- Walk-forward testing across bullish, bearish, and choppy regimes.
- Out-of-sample data after parameter selection.
- Maximum drawdown, average R, profit factor, win rate, and trade frequency.

Before live trading:

1. Backtest with realistic costs.
2. Forward test in paper mode.
3. Run on Bybit testnet with small size.
4. Review the CSV journal manually.
5. Only then consider live deployment with restricted keys and low leverage.

## Recommended starting settings

```env
TESTNET=true
PAPER_TRADING=true
SYMBOL=BTCUSDT
ENTRY_INTERVAL=15
RISK_PER_TRADE_USD=10
TARGET_PROFIT_USD=50
MINIMUM_RR=3
MAX_TRADES_PER_DAY=2
MAX_DAILY_LOSS_USD=30
MAX_CONSECUTIVE_LOSSES=2
LEVERAGE=2
MAX_LEVERAGE=3
USE_ATR_FILTER=true
USE_VOLUME_FILTER=true
USE_SESSION_FILTER=true
SESSION_START=07:00
SESSION_END=23:00
ENABLE_LONG_TRADES=true
ENABLE_SHORT_TRADES=true
```

## Limitations

- Live API validation cannot be performed unless real testnet credentials are
  present in local environment variables.
- Exchange downtime, internet disconnections, API changes, and liquidation
  events can still cause missed exits or slippage.
- The included strategy is a production-quality starting point, not a guarantee
  of future performance. Parameters must be tested and reviewed before live
  risk.
