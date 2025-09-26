const axios = require('axios');

const BASE = 'https://api.binance.com';

async function fetchJson(url, params = {}) {
  const resp = await axios.get(url, { params, timeout: 15000, headers: { 'Accept': 'application/json' } });
  return resp.data;
}

async function getExchangeInfo() {
  return fetchJson(`${BASE}/api/v3/exchangeInfo`);
}

async function getKlines(symbol, interval, limit = 500) {
  return fetchJson(`${BASE}/api/v3/klines`, { symbol, interval, limit });
}

async function getAggTrades(symbol, limit = 600) {
  return fetchJson(`${BASE}/api/v3/aggTrades`, { symbol, limit });
}

module.exports = { fetchJson, getExchangeInfo, getKlines, getAggTrades };


