# Bybit BTCUSDT Testnet-First Trading Bot

Professional Python trading bot for BTCUSDT on Bybit USDT perpetual futures. It is designed to run on Bybit testnet first and uses fixed-dollar risk, hard daily risk limits, stop loss, take profit, spread checks, and CSV journaling.

This software does not guarantee profit. Crypto futures are high risk. Never run live until the strategy has passed your own historical testing, forward paper trading, and Bybit testnet validation.

## Strategy logic

The bot combines higher-timeframe trend following with a lower-timeframe liquidity entry model:

1. Higher-timeframe filter:
   - Uses H1 and H4 candles.
   - Requires EMA 50 and EMA 200 alignment.
   - Long bias requires price above EMA 50, EMA 50 above EMA 200, and a non-declining EMA 50.
   - Short bias requires price below EMA 50, EMA 50 below EMA 200, and a non-rising EMA 50.
   - If H1 and H4 disagree, no trade is allowed.

2. Entry timeframe:
   - Default entry timeframe is M15 (`ENTRY_TIMEFRAME=15`).
   - M5 can be used by setting `ENTRY_TIMEFRAME=5`, but it is noisier and should be retested.

3. Smart Money / ICT-style entry model:
   - Detects confirmed swing highs and swing lows.
   - Looks for a liquidity sweep:
     - Long: price wicks below a prior swing low and closes back above it.
     - Short: price wicks above a prior swing high and closes back below it.
   - Requires a BOS/CHoCH after the sweep:
     - Long: close breaks a prior swing high.
     - Short: close breaks a prior swing low.
   - Requires a recent fair value gap:
     - Bullish FVG: current candle low is above the high from two candles back.
     - Bearish FVG: current candle high is below the low from two candles back.
   - Attempts to identify the last opposite candle before the structure break as an order-block context.
   - Uses premium/discount filtering:
     - Longs are blocked if price is too deep in premium.
     - Shorts are blocked if price is too deep in discount.
   - Blocks extended candles to avoid chasing.

4. Volatility, volume, and execution filters:
   - ATR percent must be between `MIN_ATR_PCT` and `MAX_ATR_PCT`.
   - Volume must be above the configured volume SMA ratio.
   - Spread must be below `MAX_SPREAD_BPS`.
   - Optional session filter defaults to 07:00-23:00 UTC.

## Why this can work on BTCUSDT

BTCUSDT often shows strong intraday directional moves when H1/H4 trend alignment, liquidity grabs, and volatility expansion happen together. The strategy tries to avoid random entries by requiring:

- A larger trend context.
- A liquidity sweep that may trap late breakout traders.
- A structure break that confirms short-term intent.
- A fair value gap/order-block area that provides a defined invalidation point.
- A hard reward-to-risk check before execution.

This can improve trade quality, but it cannot remove market risk. BTC can reverse sharply, spreads can widen, liquidity can thin, and news events can invalidate technical setups.

## Risk model

Defaults:

- `RISK_PER_TRADE_USD=10`
- `TARGET_PROFIT_USD=50`
- `MINIMUM_RR=3`
- `MAX_TRADES_PER_DAY=2`
- `MAX_DAILY_LOSS_USD=30`
- `MAX_CONSECUTIVE_LOSSES=2`
- `LEVERAGE=2`
- `MAX_LEVERAGE=5`

Position size is calculated from the stop distance:

```text
quantity = RISK_PER_TRADE_USD / abs(entry_price - stop_loss)
```

The bot does not use martingale, grid trading, recovery systems, revenge trading, or position-size increases after losses. It stops taking new trades when:

- An open BTCUSDT position already exists.
- The daily trade limit is reached.
- Daily realized loss reaches the configured limit.
- Consecutive losses reach the configured limit.
- Reward-to-risk is below the configured minimum.
- Spread, volume, volatility, or session filters fail.

## About $50-$100 target profit with $10 risk

A $50 profit target with $10 risk requires roughly 1:5 reward-to-risk. A $100 target with $10 risk requires roughly 1:10. The bot defaults to at least 1:3 and, with the default `$50 / $10`, attempts to place a 1:5 take profit when the setup supports it.

These outcomes cannot be guaranteed. The market may not reach take profit, orders may slip, fees reduce net PnL, and high-RR targets usually have lower hit rates than smaller targets. A 65%-70% win rate is a backtesting and optimization target, not a promise.

## Project files

- `main.py` - live/testnet/paper orchestration loop.
- `config.py` - environment loading and validation.
- `strategy.py` - backtest-ready OHLCV signal engine.
- `risk_manager.py` - fixed-risk sizing, safety limits, and CSV journal.
- `bybit_client.py` - pybit execution adapter.
- `logger.py` - console and rotating-file logging.
- `requirements.txt` - Python dependencies.
- `.env.example` - safe configuration template.
- `README.md` - setup, safety, and operating instructions.

## Installation

Use Python 3.10 or newer.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` before running.

## Bybit testnet setup

1. Open Bybit testnet: `https://testnet.bybit.com/`
2. Create or log in to a testnet account.
3. Open API management.
4. Create an API key for testnet only.
5. Recommended permissions:
   - Read-only account/position access.
   - Derivatives/contract trade permission for placing and managing USDT perpetual orders.
   - No withdrawal permission.
6. Restrict the API key by IP if your deployment environment has a stable IP.
7. Put the keys in `.env`:

```bash
BYBIT_API_KEY=your_testnet_key
BYBIT_API_SECRET=your_testnet_secret
TESTNET=true
```

The bot uses `TESTNET=true` by default.

## API key safety

- Never hardcode keys in Python files.
- Never commit `.env`.
- Use different keys for testnet and live.
- Disable withdrawal permissions.
- Delete and recreate keys if they may have been exposed.
- Start with the smallest practical testnet balance and conservative leverage.

## Running the bot

One test cycle:

```bash
python main.py --once
```

Continuous testnet execution:

```bash
python main.py
```

Paper mode using public market data and no exchange orders:

```bash
python main.py --paper --once
python main.py --paper
```

Logs are written to `bot.log`. Trade events are appended to `trades_journal.csv`.

## Live trading lock

Live trading is intentionally blocked unless all of the following are true:

```env
TESTNET=false
PAPER_TRADING=false
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_THE_RISK
```

Do not enable this until historical tests, paper trading, and Bybit testnet results are acceptable.

## Backtesting guidance

The strategy is backtest-ready because `strategy.generate_signal()` accepts plain OHLCV DataFrames for the entry timeframe, H1, and H4. For a proper backtest:

1. Export or download historical BTCUSDT OHLCV data for M15, H1, and H4.
2. Build a candle-by-candle simulation that calls `generate_signal()` with only data available up to each historical candle.
3. Simulate entries at realistic prices with fees, funding, slippage, and spread.
4. Apply the same stop loss, take profit, daily loss, and consecutive-loss rules.
5. Review win rate, profit factor, average R multiple, max drawdown, average trade duration, and sensitivity across market regimes.

Avoid optimizing only for the best historical result. A strategy that performs only after excessive parameter tuning is likely overfit.

## Recommended starting settings

Keep the defaults until the testnet journal shows stable behavior:

```env
TESTNET=true
RISK_PER_TRADE_USD=10
TARGET_PROFIT_USD=50
MINIMUM_RR=3
MAX_TRADES_PER_DAY=2
MAX_DAILY_LOSS_USD=30
MAX_CONSECUTIVE_LOSSES=2
LEVERAGE=2
MAX_LEVERAGE=5
ENTRY_TIMEFRAME=15
USE_ATR_FILTER=true
USE_VOLUME_FILTER=true
USE_SESSION_FILTER=true
SESSION_START=07:00
SESSION_END=23:00
```

If testnet liquidity, fees, or slippage make 1:5 targets unrealistic, reduce expectations before changing risk. Do not increase risk to compensate for poor results.

## Practical limitations

- Real order fills, slippage, liquidation risk, funding, and latency can only be validated with live exchange conditions.
- The bot cannot guarantee a target win rate or fixed dollar profit.
- Closed-trade loss limits depend on Bybit PnL history being available and synced into the CSV journal.
- API downtime or network errors can delay order or PnL updates, so the main loop skips unsafe cycles when required checks fail.
- Strategy parameters should be validated on data that includes trending, ranging, high-volatility, and low-liquidity regimes.
