const axios = require('axios');

class BinanceService {
  constructor() {
    this.baseUrl = 'https://api.binance.com';
    this.timeout = 15000;
  }

  /**
   * Fetch JSON data from Binance API
   * @param {string} url - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response data
   */
  async fetchJson(url, params = {}) {
    const response = await axios.get(url, {
      params,
      timeout: this.timeout,
      headers: { 'Accept': 'application/json' }
    });
    return response.data;
  }

  /**
   * Get exchange information
   * @returns {Promise<Object>} Exchange info
   */
  async getExchangeInfo() {
    return this.fetchJson(`${this.baseUrl}/api/v3/exchangeInfo`);
  }

  /**
   * Get kline/candlestick data
   * @param {string} symbol - Trading symbol
   * @param {string} interval - Time interval
   * @param {number} limit - Number of klines to retrieve
   * @returns {Promise<Array>} Kline data
   */
  async getKlines(symbol, interval, limit = 500) {
    return this.fetchJson(`${this.baseUrl}/api/v3/klines`, { 
      symbol, 
      interval, 
      limit 
    });
  }

  /**
   * Get aggregated trades data
   * @param {string} symbol - Trading symbol
   * @param {number} limit - Number of trades to retrieve
   * @returns {Promise<Array>} Aggregated trades data
   */
  async getAggTrades(symbol, limit = 600) {
    return this.fetchJson(`${this.baseUrl}/api/v3/aggTrades`, { 
      symbol, 
      limit 
    });
  }

  /**
   * Get trading symbols filtered by criteria
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Filtered symbols
   */
  async getTradingSymbols(options = {}) {
    const {
      quoteAsset = 'USDT',
      excludeUpDown = true,
      status = 'TRADING'
    } = options;

    const info = await this.getExchangeInfo();
    let symbols = (info.symbols || [])
      .filter(s => s.status === status && s.quoteAsset === quoteAsset);

    if (excludeUpDown) {
      symbols = symbols.filter(s => 
        !s.symbol.includes('UPUSDT') && !s.symbol.includes('DOWNUSDT')
      );
    }

    return symbols.map(s => s.symbol).sort();
  }

  /**
   * Build bars from aggregated trades for 30s timeframe
   * @param {string} symbol - Trading symbol
   * @param {number} limit - Number of trades to process
   * @returns {Promise<Array>} Bar data
   */
  async build30sBarsFromTrades(symbol, limit = 800) {
    const trades = await this.getAggTrades(symbol, limit);
    const byBucket = new Map();
    
    for (const t of trades) {
      const ts = t.T;
      const bucket = Math.floor(ts / 30000) * 30000;
      const price = parseFloat(t.p);
      const qty = parseFloat(t.q);
      
      let b = byBucket.get(bucket);
      if (!b) {
        b = { 
          time: bucket, 
          open: price, 
          high: price, 
          low: price, 
          close: price, 
          volume: qty 
        };
        byBucket.set(bucket, b);
      } else {
        b.high = Math.max(b.high, price);
        b.low = Math.min(b.low, price);
        b.close = price;
        b.volume += qty;
      }
    }
    
    return Array.from(byBucket.values())
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Build synthetic 30s bars from 1m klines
   * @param {string} symbol - Trading symbol
   * @param {number} limit - Number of 1m klines to process
   * @returns {Promise<Array>} Synthetic bar data
   */
  async buildSynthetic30sBars(symbol, limit = 150) {
    const kl = await this.getKlines(symbol, '1m', limit);
    const m1 = kl.map((k) => ({
      time: k[0],
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4],
      volume: +k[5]
    }));
    
    const synthetic = [];
    for (const b of m1) {
      synthetic.push({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: (b.open + b.close) / 2,
        volume: b.volume / 2
      });
      synthetic.push({
        time: b.time + 30000,
        open: (b.open + b.close) / 2,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume / 2
      });
    }
    
    return synthetic;
  }

  /**
   * Build bars for any timeframe
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe (30s, 1m, 5m, etc.)
   * @returns {Promise<Object>} Bar data with metadata
   */
  async buildBars(symbol, timeframe) {
    if (timeframe === '30s') {
      try {
        const bars = await this.build30sBarsFromTrades(symbol, 800);
        if (bars.length > 100) bars = bars.slice(bars.length - 100);
        if (bars.length < 10) throw new Error('Not enough real 30s data');
        
        return {
          bars,
          mode: 'real',
          source: 'aggTrades'
        };
      } catch (e) {
        const bars = await this.buildSynthetic30sBars(symbol, 150);
        return {
          bars: bars.slice(-100),
          mode: 'synthetic',
          source: '1m_klines'
        };
      }
    } else {
      // Map custom timeframes to Binance timeframes
      const tfMap = {
        '1m': '1m',
        '3m': '3m',
        '5m': '5m',
        '1h': '1h',
        '2h': '2h',
        '3h': '3h',
        '5h': '4h',
        '10h': '8h',
        '1d': '1d',
        '2d': '3d',
        '3d': '3d'
      };
      
      const interval = tfMap[timeframe] || '1m';
      const limit = 200;
      const kl = await this.getKlines(symbol, interval, limit);
      const bars = kl.map((k) => ({
        time: k[0],
        open: +k[1],
        high: +k[2],
        low: +k[3],
        close: +k[4],
        volume: +k[5]
      }));
      
      return {
        bars: bars.length > 120 ? bars.slice(-120) : bars,
        mode: interval === '1m' ? 'gerçək' : 'klines',
        source: 'klines'
      };
    }
  }

  /**
   * Get bars for multiple symbols
   * @param {Array} symbols - Array of trading symbols
   * @param {string} timeframe - Timeframe
   * @returns {Promise<Object>} Bars data by symbol
   */
  async getBarsForSymbols(symbols, timeframe) {
    const allBars = {};
    for (const symbol of symbols) {
      const result = await this.buildBars(symbol, timeframe);
      allBars[symbol] = result.bars;
    }
    return allBars;
  }

  /**
   * Get recent price data for symbols
   * @param {Array} symbols - Array of trading symbols
   * @param {string} timeframe - Timeframe
   * @param {number} periods - Number of recent periods
   * @returns {Promise<Object>} Recent price data by symbol
   */
  async getRecentPrices(symbols, timeframe, periods = 60) {
    const allBars = await this.getBarsForSymbols(symbols, timeframe);
    return Object.fromEntries(
      Object.entries(allBars).map(([symbol, bars]) => [
        symbol, 
        bars.map(b => b.close).slice(-periods)
      ])
    );
  }
}

module.exports = new BinanceService();
