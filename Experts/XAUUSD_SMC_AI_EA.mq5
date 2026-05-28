//+------------------------------------------------------------------+
//|                                           XAUUSD_SMC_AI_EA.mq5   |
//| Smart Money Concepts / ICT Expert Advisor for MetaTrader 5       |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "XAUUSD M5/M15 Smart Money Concepts EA with strict risk controls."

#include <Trade/Trade.mqh>

enum ENUM_SIGNAL_DIRECTION
{
   SIGNAL_NONE = 0,
   SIGNAL_BUY  = 1,
   SIGNAL_SELL = -1
};

struct PriceZone
{
   bool     valid;
   double   low;
   double   high;
   datetime time;
   int      shift;
};

struct TradeSignal
{
   ENUM_SIGNAL_DIRECTION direction;
   double                entry;
   double                stop_loss;
   double                take_profit;
   double                rr;
   int                   score;
   double                sweep_level;
   double                bos_level;
   string                reason;
   PriceZone             fvg;
   PriceZone             order_block;
};

input group "Core"
input string          InpTradeSymbol              = "XAUUSD";
input ENUM_TIMEFRAMES InpEntryTimeframe           = PERIOD_M5;
input ENUM_TIMEFRAMES InpTrendTimeframe           = PERIOD_M15;
input long            InpMagicNumber              = 28052601;
input int             InpMaxSpreadPoints          = 350;
input int             InpMaxSlippagePoints        = 50;

input group "Risk Management"
input double          InpRiskPerTradePercent      = 0.75;     // Clamped internally to 0.5%-1.0%
input double          InpMinRiskPercent           = 0.50;
input double          InpMaxRiskPercent           = 1.00;
input int             InpMaxTradesPerDay          = 2;
input double          InpMaxDailyLossPercent      = 2.00;
input double          InpMaxDrawdownPercent       = 6.00;
input double          InpMinimumRR                = 2.00;
input bool            InpBlockIfAnySymbolPosition = true;

input group "SMC / ICT Model"
input int             InpSweepLookbackBars        = 24;
input int             InpSweepMaxAgeBars          = 8;
input int             InpMinSweepPoints           = 25;
input int             InpBosLookbackBars          = 20;
input int             InpMinBosBreakPoints        = 15;
input int             InpFvgLookbackBars          = 12;
input int             InpMinFvgPoints             = 20;
input int             InpOrderBlockLookbackBars   = 18;
input int             InpSwingStopLookbackBars    = 14;
input int             InpStopBufferPoints         = 80;
input int             InpLiquidityTargetLookback  = 48;
input int             InpMinimumSignalScore       = 80;

input group "Trend Filter"
input int             InpFastEmaPeriod            = 20;
input int             InpSlowEmaPeriod            = 50;

input group "Session Filter - UTC"
input bool            InpUseSessionFilter         = true;
input int             InpLondonStartHourUTC       = 7;
input int             InpLondonEndHourUTC         = 11;
input int             InpNewYorkStartHourUTC      = 13;
input int             InpNewYorkEndHourUTC        = 17;

input group "News Filter"
input bool            InpUseNewsFilter            = true;
input string          InpNewsCurrency             = "USD";
input int             InpNewsMinutesBefore        = 30;
input int             InpNewsMinutesAfter         = 30;

CTrade trade;

int      g_fast_ema_handle = INVALID_HANDLE;
int      g_slow_ema_handle = INVALID_HANDLE;
datetime g_last_entry_bar_time = 0;
datetime g_day_start = 0;
double   g_day_start_equity = 0.0;
double   g_initial_equity = 0.0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(InpTradeSymbol == "")
   {
      Print("Trade symbol is empty.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(InpEntryTimeframe != PERIOD_M5 && InpEntryTimeframe != PERIOD_M15)
   {
      Print("Entry timeframe must be M5 or M15 for this XAUUSD model.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(InpTrendTimeframe != PERIOD_M15)
   {
      Print("Trend timeframe must be M15 for the supplied SMC model.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(InpMinimumRR < 2.0)
   {
      Print("Minimum RR must be at least 2.0.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(!SymbolSelect(InpTradeSymbol, true))
   {
      PrintFormat("Unable to select symbol %s.", InpTradeSymbol);
      return INIT_FAILED;
   }

   g_fast_ema_handle = iMA(InpTradeSymbol, InpTrendTimeframe, InpFastEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_slow_ema_handle = iMA(InpTradeSymbol, InpTrendTimeframe, InpSlowEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_fast_ema_handle == INVALID_HANDLE || g_slow_ema_handle == INVALID_HANDLE)
   {
      Print("Unable to create EMA trend filter handles.");
      return INIT_FAILED;
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpMaxSlippagePoints);

   RefreshRiskAnchors();
   PrintFormat("XAUUSD SMC AI EA initialized on %s. Daily equity anchor: %.2f, initial equity anchor: %.2f",
               InpTradeSymbol, g_day_start_equity, g_initial_equity);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_fast_ema_handle != INVALID_HANDLE)
      IndicatorRelease(g_fast_ema_handle);
   if(g_slow_ema_handle != INVALID_HANDLE)
      IndicatorRelease(g_slow_ema_handle);
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(!IsNewEntryBar())
      return;

   RefreshRiskAnchors();

   string block_reason = "";
   if(!TradingAllowed(block_reason))
   {
      PrintFormat("Trading blocked: %s", block_reason);
      return;
   }

   TradeSignal signal;
   ResetSignal(signal);

   if(!BuildSignal(signal))
      return;

   if(signal.score < InpMinimumSignalScore)
   {
      PrintFormat("Signal ignored: score %d is below minimum %d. %s",
                  signal.score, InpMinimumSignalScore, signal.reason);
      return;
   }

   ExecuteSignal(signal);
}

//+------------------------------------------------------------------+
bool IsNewEntryBar()
{
   datetime bar_time = iTime(InpTradeSymbol, InpEntryTimeframe, 0);
   if(bar_time <= 0 || bar_time == g_last_entry_bar_time)
      return false;

   g_last_entry_bar_time = bar_time;
   return true;
}

//+------------------------------------------------------------------+
void ResetZone(PriceZone &zone)
{
   zone.valid = false;
   zone.low = 0.0;
   zone.high = 0.0;
   zone.time = 0;
   zone.shift = -1;
}

//+------------------------------------------------------------------+
void ResetSignal(TradeSignal &signal)
{
   signal.direction = SIGNAL_NONE;
   signal.entry = 0.0;
   signal.stop_loss = 0.0;
   signal.take_profit = 0.0;
   signal.rr = 0.0;
   signal.score = 0;
   signal.sweep_level = 0.0;
   signal.bos_level = 0.0;
   signal.reason = "";
   ResetZone(signal.fvg);
   ResetZone(signal.order_block);
}

//+------------------------------------------------------------------+
bool BuildSignal(TradeSignal &signal)
{
   const int bars_required = MathMax(120,
                              MathMax(InpLiquidityTargetLookback + 10,
                              MathMax(InpSweepLookbackBars + InpSweepMaxAgeBars + 10,
                                      InpSlowEmaPeriod + 10)));

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(InpTradeSymbol, InpEntryTimeframe, 0, bars_required, rates);
   if(copied < bars_required / 2)
   {
      Print("Not enough entry timeframe history for SMC evaluation.");
      return false;
   }

   int trend = TrendDirection();
   if(trend == 0)
      return false;

   int buy_sweep_shift = -1;
   int sell_sweep_shift = -1;
   double buy_sweep_level = 0.0;
   double sell_sweep_level = 0.0;

   bool has_buy_sweep = FindRecentLiquiditySweep(rates, copied, SIGNAL_BUY, buy_sweep_shift, buy_sweep_level);
   bool has_sell_sweep = FindRecentLiquiditySweep(rates, copied, SIGNAL_SELL, sell_sweep_shift, sell_sweep_level);

   if(trend > 0 && has_buy_sweep)
      return BuildDirectionalSignal(rates, copied, SIGNAL_BUY, buy_sweep_shift, buy_sweep_level, signal);

   if(trend < 0 && has_sell_sweep)
      return BuildDirectionalSignal(rates, copied, SIGNAL_SELL, sell_sweep_shift, sell_sweep_level, signal);

   return false;
}

//+------------------------------------------------------------------+
bool BuildDirectionalSignal(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                            const int sweep_shift, const double sweep_level, TradeSignal &signal)
{
   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   double ask = SymbolInfoDouble(InpTradeSymbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(InpTradeSymbol, SYMBOL_BID);
   double entry = (direction == SIGNAL_BUY ? ask : bid);

   double bos_level = 0.0;
   if(!HasBreakOfStructure(rates, copied, direction, sweep_shift, bos_level))
      return false;

   PriceZone fvg;
   PriceZone order_block;
   ResetZone(fvg);
   ResetZone(order_block);

   if(!FindFairValueGap(rates, copied, direction, sweep_shift, fvg))
      return false;

   if(!FindOrderBlock(rates, copied, direction, sweep_shift, order_block))
      return false;

   bool price_in_fvg = PriceTouchesZone(entry, rates[1], fvg, InpMinFvgPoints * point);
   bool price_in_ob = PriceTouchesZone(entry, rates[1], order_block, InpMinFvgPoints * point);
   if(!price_in_fvg && !price_in_ob)
      return false;

   double sl = CalculateStopLoss(rates, copied, direction);
   if(sl <= 0.0)
      return false;

   if(direction == SIGNAL_BUY && sl >= entry)
      return false;
   if(direction == SIGNAL_SELL && sl <= entry)
      return false;

   double tp = CalculateTakeProfit(rates, copied, direction, entry, sl);
   if(tp <= 0.0)
      return false;

   double rr = RewardToRisk(direction, entry, sl, tp);
   if(rr + 0.0001 < InpMinimumRR)
      return false;

   int score = 0;
   score += 20; // Liquidity sweep.
   score += 25; // BOS.
   score += 20; // FVG.
   score += 15; // Order block.
   score += 15; // M15 trend alignment.
   if(ZonesOverlap(fvg, order_block))
      score += 5;

   signal.direction = direction;
   signal.entry = NormalizePrice(entry);
   signal.stop_loss = NormalizePrice(sl);
   signal.take_profit = NormalizePrice(tp);
   signal.rr = rr;
   signal.score = score;
   signal.sweep_level = NormalizePrice(sweep_level);
   signal.bos_level = NormalizePrice(bos_level);
   signal.fvg = fvg;
   signal.order_block = order_block;
   signal.reason = StringFormat("%s SMC setup: sweep %.2f, BOS %.2f, FVG %.2f-%.2f, OB %.2f-%.2f, RR %.2f, score %d",
                                (direction == SIGNAL_BUY ? "BUY" : "SELL"),
                                signal.sweep_level,
                                signal.bos_level,
                                NormalizePrice(fvg.low),
                                NormalizePrice(fvg.high),
                                NormalizePrice(order_block.low),
                                NormalizePrice(order_block.high),
                                rr,
                                score);

   return true;
}

//+------------------------------------------------------------------+
int TrendDirection()
{
   double fast[];
   double slow[];
   MqlRates trend_rates[];

   ArraySetAsSeries(fast, true);
   ArraySetAsSeries(slow, true);
   ArraySetAsSeries(trend_rates, true);

   if(CopyBuffer(g_fast_ema_handle, 0, 0, 4, fast) < 4)
      return 0;
   if(CopyBuffer(g_slow_ema_handle, 0, 0, 4, slow) < 4)
      return 0;
   if(CopyRates(InpTradeSymbol, InpTrendTimeframe, 0, 20, trend_rates) < 20)
      return 0;

   bool bullish_ema = fast[1] > slow[1] && trend_rates[1].close > slow[1] && fast[1] >= fast[2];
   bool bearish_ema = fast[1] < slow[1] && trend_rates[1].close < slow[1] && fast[1] <= fast[2];

   double recent_high = HighestHigh(trend_rates, 2, 8, 20);
   double recent_low = LowestLow(trend_rates, 2, 8, 20);
   bool bullish_structure = trend_rates[1].close >= recent_high || trend_rates[1].low > recent_low;
   bool bearish_structure = trend_rates[1].close <= recent_low || trend_rates[1].high < recent_high;

   if(bullish_ema && bullish_structure)
      return 1;
   if(bearish_ema && bearish_structure)
      return -1;

   return 0;
}

//+------------------------------------------------------------------+
bool FindRecentLiquiditySweep(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                              int &sweep_shift, double &sweep_level)
{
   sweep_shift = -1;
   sweep_level = 0.0;

   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   int max_shift = MathMin(InpSweepMaxAgeBars + 1, copied - InpSweepLookbackBars - 2);

   for(int shift = 2; shift <= max_shift; shift++)
   {
      int from = shift + 1;
      int to = MathMin(shift + InpSweepLookbackBars, copied - 1);
      if(to <= from)
         continue;

      if(direction == SIGNAL_BUY)
      {
         double level = LowestLow(rates, from, to, copied);
         bool swept_low = rates[shift].low < level - InpMinSweepPoints * point;
         bool reclaimed = rates[shift].close > level;
         if(swept_low && reclaimed)
         {
            sweep_shift = shift;
            sweep_level = level;
            return true;
         }
      }
      else if(direction == SIGNAL_SELL)
      {
         double level = HighestHigh(rates, from, to, copied);
         bool swept_high = rates[shift].high > level + InpMinSweepPoints * point;
         bool rejected = rates[shift].close < level;
         if(swept_high && rejected)
         {
            sweep_shift = shift;
            sweep_level = level;
            return true;
         }
      }
   }

   return false;
}

//+------------------------------------------------------------------+
bool HasBreakOfStructure(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                         const int sweep_shift, double &bos_level)
{
   bos_level = 0.0;
   if(sweep_shift < 2)
      return false;

   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   int from = 2;
   int to = MathMin(sweep_shift, MathMin(InpBosLookbackBars, copied - 1));
   if(to < from)
      return false;

   if(direction == SIGNAL_BUY)
   {
      bos_level = HighestHigh(rates, from, to, copied);
      return rates[1].close > bos_level + InpMinBosBreakPoints * point;
   }

   if(direction == SIGNAL_SELL)
   {
      bos_level = LowestLow(rates, from, to, copied);
      return rates[1].close < bos_level - InpMinBosBreakPoints * point;
   }

   return false;
}

//+------------------------------------------------------------------+
bool FindFairValueGap(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                      const int sweep_shift, PriceZone &zone)
{
   ResetZone(zone);
   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   int max_newer_shift = MathMin(InpFvgLookbackBars, copied - 3);

   for(int newer = 1; newer <= max_newer_shift; newer++)
   {
      int older = newer + 2;
      if(older >= copied)
         break;

      if(sweep_shift > 0 && older > sweep_shift + 2)
         continue;

      if(direction == SIGNAL_BUY)
      {
         double gap_low = rates[older].high;
         double gap_high = rates[newer].low;
         if(gap_high > gap_low + InpMinFvgPoints * point)
         {
            zone.valid = true;
            zone.low = gap_low;
            zone.high = gap_high;
            zone.time = rates[newer].time;
            zone.shift = newer;
            return true;
         }
      }
      else if(direction == SIGNAL_SELL)
      {
         double gap_low = rates[newer].high;
         double gap_high = rates[older].low;
         if(gap_high > gap_low + InpMinFvgPoints * point)
         {
            zone.valid = true;
            zone.low = gap_low;
            zone.high = gap_high;
            zone.time = rates[newer].time;
            zone.shift = newer;
            return true;
         }
      }
   }

   return false;
}

//+------------------------------------------------------------------+
bool FindOrderBlock(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                    const int sweep_shift, PriceZone &zone)
{
   ResetZone(zone);
   int to = MathMin(InpOrderBlockLookbackBars, copied - 2);
   if(sweep_shift > 0)
      to = MathMin(to, sweep_shift + 4);

   for(int shift = 2; shift <= to; shift++)
   {
      double body = MathAbs(rates[shift].close - rates[shift].open);
      double range = rates[shift].high - rates[shift].low;
      if(range <= 0.0 || body < range * 0.25)
         continue;

      if(direction == SIGNAL_BUY && rates[shift].close < rates[shift].open)
      {
         zone.valid = true;
         zone.low = rates[shift].low;
         zone.high = rates[shift].high;
         zone.time = rates[shift].time;
         zone.shift = shift;
         return true;
      }

      if(direction == SIGNAL_SELL && rates[shift].close > rates[shift].open)
      {
         zone.valid = true;
         zone.low = rates[shift].low;
         zone.high = rates[shift].high;
         zone.time = rates[shift].time;
         zone.shift = shift;
         return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
bool PriceTouchesZone(const double price, const MqlRates &bar, const PriceZone &zone, const double tolerance)
{
   if(!zone.valid)
      return false;

   double low = zone.low - tolerance;
   double high = zone.high + tolerance;
   if(price >= low && price <= high)
      return true;

   return bar.low <= high && bar.high >= low;
}

//+------------------------------------------------------------------+
bool ZonesOverlap(const PriceZone &first, const PriceZone &second)
{
   if(!first.valid || !second.valid)
      return false;

   return first.low <= second.high && second.low <= first.high;
}

//+------------------------------------------------------------------+
double CalculateStopLoss(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction)
{
   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   int to = MathMin(InpSwingStopLookbackBars, copied - 1);
   if(to < 2)
      return 0.0;

   if(direction == SIGNAL_BUY)
      return LowestLow(rates, 1, to, copied) - InpStopBufferPoints * point;

   if(direction == SIGNAL_SELL)
      return HighestHigh(rates, 1, to, copied) + InpStopBufferPoints * point;

   return 0.0;
}

//+------------------------------------------------------------------+
double CalculateTakeProfit(MqlRates &rates[], const int copied, const ENUM_SIGNAL_DIRECTION direction,
                           const double entry, const double stop_loss)
{
   double fixed_tp = 0.0;
   double risk = MathAbs(entry - stop_loss);
   if(risk <= 0.0)
      return 0.0;

   if(direction == SIGNAL_BUY)
   {
      fixed_tp = entry + risk * InpMinimumRR;
      double liquidity_tp = HighestHigh(rates, 2, MathMin(InpLiquidityTargetLookback, copied - 1), copied);
      if(liquidity_tp > entry && RewardToRisk(direction, entry, stop_loss, liquidity_tp) >= InpMinimumRR)
         return liquidity_tp;
      return fixed_tp;
   }

   if(direction == SIGNAL_SELL)
   {
      fixed_tp = entry - risk * InpMinimumRR;
      double liquidity_tp = LowestLow(rates, 2, MathMin(InpLiquidityTargetLookback, copied - 1), copied);
      if(liquidity_tp < entry && RewardToRisk(direction, entry, stop_loss, liquidity_tp) >= InpMinimumRR)
         return liquidity_tp;
      return fixed_tp;
   }

   return 0.0;
}

//+------------------------------------------------------------------+
double RewardToRisk(const ENUM_SIGNAL_DIRECTION direction, const double entry, const double stop_loss, const double take_profit)
{
   double risk = MathAbs(entry - stop_loss);
   if(risk <= 0.0)
      return 0.0;

   if(direction == SIGNAL_BUY)
      return (take_profit - entry) / risk;

   if(direction == SIGNAL_SELL)
      return (entry - take_profit) / risk;

   return 0.0;
}

//+------------------------------------------------------------------+
bool TradingAllowed(string &reason)
{
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      reason = "terminal trading is disabled";
      return false;
   }

   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      reason = "expert trading is disabled";
      return false;
   }

   if(!IsSpreadAcceptable())
   {
      reason = "spread is above configured maximum";
      return false;
   }

   if(InpUseSessionFilter && !IsInTradingSession())
   {
      reason = "outside London/New York trading sessions";
      return false;
   }

   if(InpUseNewsFilter && IsHighImpactNewsWindow())
   {
      reason = "inside high-impact news filter window";
      return false;
   }

   if(CountOpenPositions() > 0)
   {
      reason = "an open position already exists";
      return false;
   }

   if(TradesOpenedToday() >= InpMaxTradesPerDay)
   {
      reason = "maximum trades per day reached";
      return false;
   }

   if(IsDailyLossLimitHit())
   {
      reason = "daily loss limit reached";
      return false;
   }

   if(IsMaxDrawdownHit())
   {
      reason = "maximum drawdown protection reached";
      return false;
   }

   reason = "";
   return true;
}

//+------------------------------------------------------------------+
bool IsSpreadAcceptable()
{
   long spread = SymbolInfoInteger(InpTradeSymbol, SYMBOL_SPREAD);
   return spread >= 0 && spread <= InpMaxSpreadPoints;
}

//+------------------------------------------------------------------+
bool IsInTradingSession()
{
   datetime now_gmt = TimeGMT();
   MqlDateTime dt;
   TimeToStruct(now_gmt, dt);

   int minutes = dt.hour * 60 + dt.min;
   bool london = IsMinuteInWindow(minutes, InpLondonStartHourUTC * 60, InpLondonEndHourUTC * 60);
   bool new_york = IsMinuteInWindow(minutes, InpNewYorkStartHourUTC * 60, InpNewYorkEndHourUTC * 60);
   return london || new_york;
}

//+------------------------------------------------------------------+
bool IsMinuteInWindow(const int minute_of_day, const int start_minute, const int end_minute)
{
   if(start_minute == end_minute)
      return true;
   if(start_minute < end_minute)
      return minute_of_day >= start_minute && minute_of_day < end_minute;
   return minute_of_day >= start_minute || minute_of_day < end_minute;
}

//+------------------------------------------------------------------+
bool IsHighImpactNewsWindow()
{
   datetime now = TradeServerTime();
   datetime from_time = now - InpNewsMinutesAfter * 60;
   datetime to_time = now + InpNewsMinutesBefore * 60;

   MqlCalendarValue values[];
   int count = CalendarValueHistory(values, from_time, to_time, NULL, InpNewsCurrency);
   if(count <= 0)
      return false;

   for(int i = 0; i < count; i++)
   {
      MqlCalendarEvent event;
      if(!CalendarEventById(values[i].event_id, event))
         continue;

      if(event.importance == CALENDAR_IMPORTANCE_HIGH)
         return true;
   }

   return false;
}

//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      long magic = PositionGetInteger(POSITION_MAGIC);

      if(symbol != InpTradeSymbol)
         continue;

      if(InpBlockIfAnySymbolPosition || magic == InpMagicNumber)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
int TradesOpenedToday()
{
   if(!HistorySelect(g_day_start, TradeServerTime()))
      return 0;

   int count = 0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)
         continue;

      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != InpTradeSymbol)
         continue;

      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber)
         continue;

      if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
double DailyClosedProfit()
{
   if(!HistorySelect(g_day_start, TradeServerTime()))
      return 0.0;

   double profit = 0.0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)
         continue;

      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != InpTradeSymbol)
         continue;

      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber)
         continue;

      profit += HistoryDealGetDouble(ticket, DEAL_PROFIT);
      profit += HistoryDealGetDouble(ticket, DEAL_SWAP);
      profit += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   }

   return profit;
}

//+------------------------------------------------------------------+
bool IsDailyLossLimitHit()
{
   if(g_day_start_equity <= 0.0)
      return false;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double loss_percent = (g_day_start_equity - equity) / g_day_start_equity * 100.0;
   return loss_percent >= InpMaxDailyLossPercent;
}

//+------------------------------------------------------------------+
bool IsMaxDrawdownHit()
{
   if(g_initial_equity <= 0.0)
      return false;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdown_percent = (g_initial_equity - equity) / g_initial_equity * 100.0;
   return drawdown_percent >= InpMaxDrawdownPercent;
}

//+------------------------------------------------------------------+
void ExecuteSignal(const TradeSignal &signal)
{
   if(!StopsAreValid(signal.direction, signal.entry, signal.stop_loss, signal.take_profit))
   {
      PrintFormat("Signal rejected by broker stop-distance rules. %s", signal.reason);
      return;
   }

   double volume = CalculatePositionSize(signal.direction, signal.entry, signal.stop_loss);
   if(volume <= 0.0)
   {
      Print("Signal rejected: calculated volume is below broker minimum or risk data is unavailable.");
      return;
   }

   bool result = false;
   string comment = StringFormat("SMC_AI_%s_RR%.2f_S%d",
                                 signal.direction == SIGNAL_BUY ? "BUY" : "SELL",
                                 signal.rr,
                                 signal.score);

   if(signal.direction == SIGNAL_BUY)
      result = trade.Buy(volume, InpTradeSymbol, 0.0, signal.stop_loss, signal.take_profit, comment);
   else if(signal.direction == SIGNAL_SELL)
      result = trade.Sell(volume, InpTradeSymbol, 0.0, signal.stop_loss, signal.take_profit, comment);

   if(result)
   {
      PrintFormat("Opened %s %.2f lots on %s. SL %.2f TP %.2f. %s",
                  signal.direction == SIGNAL_BUY ? "BUY" : "SELL",
                  volume,
                  InpTradeSymbol,
                  signal.stop_loss,
                  signal.take_profit,
                  signal.reason);
   }
   else
   {
      PrintFormat("Order failed: retcode=%d, description=%s",
                  trade.ResultRetcode(),
                  trade.ResultRetcodeDescription());
   }
}

//+------------------------------------------------------------------+
double CalculatePositionSize(const ENUM_SIGNAL_DIRECTION direction, const double entry, const double stop_loss)
{
   double risk_percent = MathMax(InpMinRiskPercent, MathMin(InpRiskPerTradePercent, InpMaxRiskPercent));
   double risk_money = AccountInfoDouble(ACCOUNT_EQUITY) * risk_percent / 100.0;
   if(risk_money <= 0.0)
      return 0.0;

   ENUM_ORDER_TYPE order_type = (direction == SIGNAL_BUY ? ORDER_TYPE_BUY : ORDER_TYPE_SELL);
   double loss_per_lot = 0.0;
   if(!OrderCalcProfit(order_type, InpTradeSymbol, 1.0, entry, stop_loss, loss_per_lot))
   {
      double tick_size = SymbolInfoDouble(InpTradeSymbol, SYMBOL_TRADE_TICK_SIZE);
      double tick_value = SymbolInfoDouble(InpTradeSymbol, SYMBOL_TRADE_TICK_VALUE_LOSS);
      if(tick_value <= 0.0)
         tick_value = SymbolInfoDouble(InpTradeSymbol, SYMBOL_TRADE_TICK_VALUE);
      if(tick_size <= 0.0 || tick_value <= 0.0)
         return 0.0;

      loss_per_lot = MathAbs(entry - stop_loss) / tick_size * tick_value;
   }

   loss_per_lot = MathAbs(loss_per_lot);
   if(loss_per_lot <= 0.0)
      return 0.0;

   double raw_volume = risk_money / loss_per_lot;
   return NormalizeVolume(raw_volume);
}

//+------------------------------------------------------------------+
double NormalizeVolume(const double raw_volume)
{
   double min_volume = SymbolInfoDouble(InpTradeSymbol, SYMBOL_VOLUME_MIN);
   double max_volume = SymbolInfoDouble(InpTradeSymbol, SYMBOL_VOLUME_MAX);
   double step = SymbolInfoDouble(InpTradeSymbol, SYMBOL_VOLUME_STEP);

   if(min_volume <= 0.0 || max_volume <= 0.0 || step <= 0.0)
      return 0.0;

   double volume = MathFloor(raw_volume / step) * step;
   volume = MathMin(volume, max_volume);

   if(volume + 0.0000001 < min_volume)
      return 0.0;

   int volume_digits = (int)MathMax(0, MathRound(-MathLog10(step)));
   return NormalizeDouble(volume, volume_digits);
}

//+------------------------------------------------------------------+
bool StopsAreValid(const ENUM_SIGNAL_DIRECTION direction, const double entry, const double stop_loss, const double take_profit)
{
   double point = SymbolInfoDouble(InpTradeSymbol, SYMBOL_POINT);
   int stops_level = (int)SymbolInfoInteger(InpTradeSymbol, SYMBOL_TRADE_STOPS_LEVEL);
   int freeze_level = (int)SymbolInfoInteger(InpTradeSymbol, SYMBOL_TRADE_FREEZE_LEVEL);
   double min_distance = MathMax(stops_level, freeze_level) * point;

   if(min_distance <= 0.0)
      min_distance = 2.0 * point;

   if(direction == SIGNAL_BUY)
      return entry - stop_loss >= min_distance && take_profit - entry >= min_distance;

   if(direction == SIGNAL_SELL)
      return stop_loss - entry >= min_distance && entry - take_profit >= min_distance;

   return false;
}

//+------------------------------------------------------------------+
void RefreshRiskAnchors()
{
   datetime today = StartOfDay(TradeServerTime());
   if(today != g_day_start)
   {
      g_day_start = today;
      string key = GlobalKey("day_equity_" + DateKey(today));
      if(GlobalVariableCheck(key))
         g_day_start_equity = GlobalVariableGet(key);
      else
      {
         g_day_start_equity = AccountInfoDouble(ACCOUNT_EQUITY);
         GlobalVariableSet(key, g_day_start_equity);
      }
   }

   string initial_key = GlobalKey("initial_equity");
   if(GlobalVariableCheck(initial_key))
      g_initial_equity = GlobalVariableGet(initial_key);
   else
   {
      g_initial_equity = AccountInfoDouble(ACCOUNT_EQUITY);
      GlobalVariableSet(initial_key, g_initial_equity);
   }
}

//+------------------------------------------------------------------+
datetime TradeServerTime()
{
   datetime server_time = TimeTradeServer();
   if(server_time <= 0)
      server_time = TimeCurrent();
   return server_time;
}

//+------------------------------------------------------------------+
datetime StartOfDay(const datetime value)
{
   MqlDateTime dt;
   TimeToStruct(value, dt);
   dt.hour = 0;
   dt.min = 0;
   dt.sec = 0;
   return StructToTime(dt);
}

//+------------------------------------------------------------------+
string DateKey(const datetime value)
{
   string key = TimeToString(value, TIME_DATE);
   StringReplace(key, ".", "");
   StringReplace(key, ":", "");
   StringReplace(key, " ", "");
   return key;
}

//+------------------------------------------------------------------+
string GlobalKey(const string suffix)
{
   return StringFormat("XAUUSD_SMC_AI_%I64d_%s_%s", InpMagicNumber, InpTradeSymbol, suffix);
}

//+------------------------------------------------------------------+
double HighestHigh(MqlRates &rates[], const int from_shift, const int to_shift, const int copied)
{
   double value = -DBL_MAX;
   int from = MathMax(from_shift, 0);
   int to = MathMin(to_shift, copied - 1);
   for(int i = from; i <= to; i++)
      value = MathMax(value, rates[i].high);
   return value;
}

//+------------------------------------------------------------------+
double LowestLow(MqlRates &rates[], const int from_shift, const int to_shift, const int copied)
{
   double value = DBL_MAX;
   int from = MathMax(from_shift, 0);
   int to = MathMin(to_shift, copied - 1);
   for(int i = from; i <= to; i++)
      value = MathMin(value, rates[i].low);
   return value;
}

//+------------------------------------------------------------------+
double NormalizePrice(const double price)
{
   int digits = (int)SymbolInfoInteger(InpTradeSymbol, SYMBOL_DIGITS);
   return NormalizeDouble(price, digits);
}
//+------------------------------------------------------------------+
