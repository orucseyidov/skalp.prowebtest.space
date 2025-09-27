const axios = require('axios');
const binanceService = require('./binance.service');

class DeepSeekService {
  constructor() {
    this.apiKey = 'sk-20cffc24a1f54a12bf20f07623db7859';
    this.baseUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  /**
   * Build bars for a symbol/timeframe using Binance service
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe (30s, 1m, 5m, etc.)
   * @returns {Array} Array of bar data
   */
  async buildBars(symbol, timeframe) {
    const result = await binanceService.buildBars(symbol, timeframe);
    return result.bars.slice(-120);
  }

  /**
   * Get analysis data for multiple symbols
   * @param {string} symbol - Primary symbol
   * @param {string} timeframe - Timeframe
   * @returns {Object} Analysis data
   */
  async getAnalysisData(symbol, timeframe) {
    // Include popular majors for context
    const majors = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const extraSymbols = Array.from(new Set([symbol, ...majors]));
    
    // Get recent prices for all symbols using Binance service
    const recentBySymbol = await binanceService.getRecentPrices(extraSymbols, timeframe, 60);
    
    // Get primary symbol bars
    const bars = await this.buildBars(symbol, timeframe);
    
    // Build allBars object for compatibility
    const allBars = {};
    for (const s of extraSymbols) {
      allBars[s] = await this.buildBars(s, timeframe);
    }

    return { bars, allBars, recentBySymbol };
  }

  /**
   * Generate analysis prompt
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe
   * @param {Object} recentBySymbol - Recent price data by symbol
   * @returns {string} Analysis prompt
   */
  generatePrompt(symbol, timeframe, recentBySymbol) {
    return `Sən qısa müddətli kripto treyd analitiksən. Zaman çərçivəsi: ${timeframe}. Seçilmiş simvol: ${symbol}.\n` +
      `Aşağıda bir neçə əsas simvol üçün son 60 bağlanış qiyməti verilir (koma ilə ayrılıb):\n` +
      `${Object.entries(recentBySymbol).map(([s, arr]) => s + ': ' + arr.join(', ')).join('\n')}\n` +
      `Bu simvolları birlikdə nəzərə alaraq ümumi trendi dəyərləndir, seçilmiş simvol üçün qısa skalp strategiyası çıxart: giriş qiyməti, qazanc hədəfi (~+0.5%), zərər dayandır (~-0.3%), və tərəf (long/short). ` +
      `Cavabı Azərbaycan dilində, qısa və actionable bəndlərlə ver.`;
  }

  /**
   * Calculate statistics for symbols
   * @param {Object} recentBySymbol - Recent price data by symbol
   * @returns {Object} Statistics
   */
  calculateStats(recentBySymbol) {
    const stats = {};
    for (const [s, arr] of Object.entries(recentBySymbol)) {
      if (arr.length > 0) {
        const first = arr[0];
        const lastClose = arr[arr.length - 1];
        const changePct = first ? ((lastClose - first) / first) * 100 : 0;
        stats[s] = { lastClose, changePct };
      } else {
        stats[s] = { lastClose: null, changePct: null };
      }
    }
    return stats;
  }

  /**
   * Get DeepSeek analysis
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe
   * @returns {Object} Analysis result
   */
  async getAnalysis(symbol, timeframe) {
    try {
      const { recentBySymbol } = await this.getAnalysisData(symbol, timeframe);
      
      const prompt = this.generatePrompt(symbol, timeframe, recentBySymbol);
      
      const response = await axios.post(this.baseUrl, {
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'Sən Azərbaycan dilində cavab verən, qısa skalp treydi üzrə analitiksən.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
        stream: false,
      }, {
        headers: { 
          Authorization: `Bearer ${this.apiKey}`, 
          'Content-Type': 'application/json' 
        }, 
        timeout: 20000,
      });

      const analysis = response.data?.choices?.[0]?.message?.content || 'Analiz tapılmadı.';
      const stats = this.calculateStats(recentBySymbol);

      return {
        analysis,
        symbols: Object.keys(recentBySymbol),
        stats
      };
    } catch (error) {
      throw {
        message: 'DeepSeek analizi alınmadı',
        status: error.response?.status,
        data: error.response?.data,
        originalError: error
      };
    }
  }
}

module.exports = new DeepSeekService();
