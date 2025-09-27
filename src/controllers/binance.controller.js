const binanceService = require('../services/binance.service');
const deepSeekService = require('../services/deepseek.service');
const asyncHandler = require('../utils/asyncHandler');

// Cache for storing API responses
const cache = new Map();

/**
 * Get trading symbols
 */
exports.getSymbols = asyncHandler(async (req, res) => {
  const cacheKey = 'symbols_usdt_trading';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const symbols = await binanceService.getTradingSymbols();
  cache.set(cacheKey, symbols, 5 * 60 * 1000); // 5 minutes cache
  res.json(symbols);
});

/**
 * Get kline/candlestick data
 */
exports.getKlines = asyncHandler(async (req, res) => {
  const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
  const interval = (req.query.interval || '1m');
  const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
  
  const cacheKey = `klines_${symbol}_${interval}_${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const data = await binanceService.getKlines(symbol, interval, limit);
  cache.set(cacheKey, data, 10 * 1000); // 10 seconds cache
  res.json(data);
});

/**
 * Technical analysis helper functions
 */
class TechnicalAnalysis {
  static sma(values, period) {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) sum -= values[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  static ema(values, period) {
    const out = new Array(values.length).fill(null);
    const k = 2 / (period + 1);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (i === period - 1) {
        let s = 0;
        for (let j = 0; j < period; j++) s += values[j];
        prev = s / period;
        out[i] = prev;
      } else if (i >= period) {
        prev = v * k + prev * (1 - k);
        out[i] = prev;
      }
    }
    return out;
  }

  static rsi(values, period = 14) {
    const out = new Array(values.length).fill(null);
    if (values.length < period + 1) return out;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
      const ch = values[i] - values[i - 1];
      if (ch >= 0) gain += ch; else loss -= ch;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / (avgLoss || 1e-12)));
    for (let i = period + 1; i < values.length; i++) {
      const ch = values[i] - values[i - 1];
      const g = ch > 0 ? ch : 0;
      const l = ch < 0 ? -ch : 0;
      avgGain = (avgGain * (period - 1) + g) / period;
      avgLoss = (avgLoss * (period - 1) + l) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / (avgLoss || 1e-12);
      out[i] = 100 - 100 / (1 + rs);
    }
    return out;
  }
}

/**
 * Get 30s scalp trading suggestions
 */
exports.getScalp30s = asyncHandler(async (req, res) => {
  const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
  const tf = (req.query.tf || '30s');
  
  const result = await binanceService.buildBars(symbol, tf);
  const bars = result.bars;
  const mode = result.mode;

  // Technical indicators: EMA7/25/99, RSI14, volume SMA20
  const closeArray = bars.map((b) => b.close);
  const volumeArray = bars.map((b) => b.volume);
  
  const ema7 = TechnicalAnalysis.ema(closeArray, 7);
  const ema25 = TechnicalAnalysis.ema(closeArray, 25);
  const ema99 = TechnicalAnalysis.ema(closeArray, 99);
  const rsi14 = TechnicalAnalysis.rsi(closeArray, 14);
  const volSma20 = TechnicalAnalysis.sma(volumeArray, 20);

  const lastIdx = bars.length - 1;
  const lastClose = closeArray[lastIdx];
  
  // Determine trend
  const trend = ema7[lastIdx] > ema25[lastIdx] && ema25[lastIdx] > ema99[lastIdx]
    ? 'only-long'
    : ema7[lastIdx] < ema25[lastIdx] && ema25[lastIdx] < ema99[lastIdx]
      ? 'only-short'
      : 'mixed';
      
  const lastRsi = rsi14[lastIdx];
  const volOk = volSma20[lastIdx] != null && volumeArray[lastIdx] > volSma20[lastIdx];

  let signal = 'Nötr';
  let suggestion = null;
  
  // Long signal conditions
  if (trend !== 'only-short' && lastRsi != null && lastRsi >= 40 && lastRsi <= 65 && volOk) {
    const prevIdx = lastIdx - 1;
    if (
      ema7[lastIdx] != null &&
      closeArray[lastIdx] > ema7[lastIdx] &&
      prevIdx >= 0 && ema7[prevIdx] != null && closeArray[prevIdx] <= ema7[prevIdx]
    ) {
      signal = 'Long düşün';
      const entry = lastClose;
      suggestion = {
        side: 'long',
        entry,
        tp: +(entry * 1.005).toFixed(6),
        sl: +(entry * 0.997).toFixed(6),
        rr: '1:1.5',
      };
    }
  }
  
  // Short signal conditions
  if (signal === 'Nötr' && trend !== 'only-long' && lastRsi != null && lastRsi >= 35 && lastRsi <= 60 && volOk) {
    const prevIdx = lastIdx - 1;
    if (
      ema7[lastIdx] != null &&
      closeArray[lastIdx] < ema7[lastIdx] &&
      prevIdx >= 0 && ema7[prevIdx] != null && closeArray[prevIdx] >= ema7[prevIdx]
    ) {
      signal = 'Short düşün';
      const entry = lastClose;
      suggestion = {
        side: 'short',
        entry,
        tp: +(entry * 0.995).toFixed(6),
        sl: +(entry * 1.003).toFixed(6),
        rr: '1:1.5',
      };
    }
  }

  res.json({
    mode: mode === 'real' ? 'gerçək 30s (aggTrades)' : 'sintetik 30s (1m-dən törədilmiş)',
    trend,
    signal,
    suggestion,
    bars,
  });
});

/**
 * Get DeepSeek AI analysis
 */
exports.getDeepSeekAnalysis = asyncHandler(async (req, res) => {
  const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
  const timeframe = (req.query.tf || '30s');

  const result = await deepSeekService.getAnalysis(symbol, timeframe);
  res.json(result);
});
