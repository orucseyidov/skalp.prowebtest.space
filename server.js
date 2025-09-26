const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { getExchangeInfo, getKlines, getAggTrades } = require('./services/binance');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// __dirname is already available in CommonJS

const app = express();
const PORT = process.env.PORT || 3000;

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow same origin and localhost dev
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const url = new URL(origin);
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.endsWith('.local')
        ) {
          return cb(null, true);
        }
      } catch (e) {}
      return cb(null, false);
    },
    optionsSuccessStatus: 200,
  })
);

// Basic rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Sessions (in-memory store for now; switch to Redis for production if needed)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'skalp_local_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

// Static files (do not auto-serve index.html to enforce auth)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Database (MySQL) setup
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'skalp',
};

let pool;
async function initDb() {
  pool = await mysql.createPool({
    ...dbConfig,
    connectionLimit: 10,
    waitForConnections: true,
  });
  // ensure users table
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  // ensure user_settings table (nullable fields)
  await pool.query(`CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    gpt_token VARCHAR(255) NULL,
    gpt_key VARCHAR(255) NULL,
    deepseek_token VARCHAR(255) NULL,
    deepseek_key VARCHAR(255) NULL,
    binance_token VARCHAR(255) NULL,
    binance_key VARCHAR(255) NULL,
    binance_user_code VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_settings_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  // seed default user if table empty
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (rows[0]?.c === 0) {
    const hash = await bcrypt.hash('password123', 10);
    await pool.query('INSERT INTO users (full_name, email, password_hash) VALUES (?,?,?)', [
      'Oruc Seyidov',
      'oruc@example.com',
      hash,
    ]);
    // create default settings row
    const [u] = await pool.query('SELECT id FROM users WHERE email=?', ['oruc@example.com']);
    if (u[0]) {
      await pool.query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [u[0].id]);
    }
    // eslint-disable-next-line no-console
    console.log('Seeded default user: oruc@example.com / password123');
  }
}
initDb().catch((e) => console.error('DB init failed', e));

// Auth helpers
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// Auth routes
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email və şifrə tələb olunur' });
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'İstifadəçi tapılmadı' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Yanlış şifrə' });
    req.session.user = { id: user.id, fullName: user.full_name, email: user.email };
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Login alınmadı' });
  }
});

app.post('/auth/logout', (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.json({ ok: true });
});

app.get('/auth/me', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ user: null });
  res.json({ user: req.session.user });
});

// Profile endpoints
app.get('/api/me/profile', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const [rows] = await pool.query('SELECT id, full_name, email, created_at FROM users WHERE id = ?', [userId]);
  const data = rows[0];
  res.json({ success: true, data });
});

app.post('/api/me/profile', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { full_name, email } = req.body || {};
  if (!full_name || !email) return res.status(400).json({ success: false, message: 'full_name və email tələb olunur' });
  await pool.query('UPDATE users SET full_name=?, email=? WHERE id=?', [String(full_name).trim(), String(email).trim(), userId]);
  req.session.user.fullName = String(full_name).trim();
  req.session.user.email = String(email).trim();
  res.json({ success: true });
});

// Settings endpoints
app.get('/api/me/settings', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  await pool.query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);
  const [rows] = await pool.query('SELECT gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code FROM user_settings WHERE user_id=?', [userId]);
  res.json({ success: true, data: rows[0] || {} });
});

app.post('/api/me/settings', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code } = req.body || {};
  await pool.query(
    `INSERT INTO user_settings (user_id, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE gpt_token=VALUES(gpt_token), gpt_key=VALUES(gpt_key), deepseek_token=VALUES(deepseek_token), deepseek_key=VALUES(deepseek_key), binance_token=VALUES(binance_token), binance_key=VALUES(binance_key), binance_user_code=VALUES(binance_user_code)`,
    [userId, gpt_token || null, gpt_key || null, deepseek_token || null, deepseek_key || null, binance_token || null, binance_key || null, binance_user_code || null]
  );
  res.json({ success: true });
});

// Change password (3000 app for local/prod when /api not proxied)
app.post('/api/me/password', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Bütün şifrə sahələri tələb olunur' });
    }
    if (String(newPassword) !== String(confirmPassword)) {
      return res.status(400).json({ success: false, message: 'Yeni şifrələr uyğun deyil' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Yeni şifrə ən az 6 simvol olmalıdır' });
    }
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id=?', [userId]);
    const hash = rows[0]?.password_hash;
    if (!hash) return res.status(400).json({ success: false, message: 'İstifadəçi tapılmadı' });
    const ok = await bcrypt.compare(String(oldPassword), hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Köhnə şifrə yanlışdır' });
    const newHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [newHash, userId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Şifrə yenilənmədi' });
  }
});

// Simple in-memory cache with TTL
class MemoryCache {
  constructor() {
    this.store = new Map();
  }
  _key(key) {
    return key;
  }
  get(key) {
    const rec = this.store.get(this._key(key));
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) {
      this.store.delete(this._key(key));
      return null;
    }
    return rec.value;
  }
  set(key, value, ttlMs) {
    this.store.set(this._key(key), { value, expiresAt: Date.now() + ttlMs });
  }
}

const cache = new MemoryCache();

// Routes
app.get('/api/symbols', async (req, res) => {
  try {
    const cacheKey = 'symbols_usdt_trading';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const info = await getExchangeInfo();
    const symbols = (info.symbols || [])
      .filter(
        (s) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && !s.symbol.includes('UPUSDT') && !s.symbol.includes('DOWNUSDT')
      )
      .map((s) => s.symbol)
      .sort();
    cache.set(cacheKey, symbols, 5 * 60 * 1000);
    res.json(symbols);
  } catch (err) {
    res.status(500).json({ error: 'Simvolları yükləmək mümkün olmadı' });
  }
});

app.get('/api/klines', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
    const interval = (req.query.interval || '1m');
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
    const cacheKey = `klines_${symbol}_${interval}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const data = await getKlines(symbol, interval, limit);
    cache.set(cacheKey, data, 10 * 1000);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Klineləri yükləmək mümkün olmadı' });
  }
});

// 30s scalp suggestions
app.get('/api/scalp30s', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
    const tf = (req.query.tf || '30s');
    // Try real 30s from aggTrades
    let mode = 'real';
    let bars = [];
    if (tf === '30s') {
      try {
        const trades = await getAggTrades(symbol, 800);
        const byBucket = new Map();
        for (const t of trades) {
          const ts = t.T;
          const bucket = Math.floor(ts / 30000) * 30000;
          const price = parseFloat(t.p);
          const qty = parseFloat(t.q);
          let b = byBucket.get(bucket);
          if (!b) {
            b = { time: bucket, open: price, high: price, low: price, close: price, volume: qty };
            byBucket.set(bucket, b);
          } else {
            b.high = Math.max(b.high, price);
            b.low = Math.min(b.low, price);
            b.close = price;
            b.volume += qty;
          }
        }
        bars = Array.from(byBucket.values()).sort((a, b) => a.time - b.time);
        if (bars.length > 100) bars = bars.slice(bars.length - 100);
        if (bars.length < 10) throw new Error('not enough');
      } catch (e) {
        mode = 'synthetic';
        const kl = await getKlines(symbol, '1m', 150);
        const m1 = kl.map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
        const synthetic = [];
        for (const b of m1) {
          synthetic.push({ time: b.time, open: b.open, high: b.high, low: b.low, close: (b.open + b.close) / 2, volume: b.volume / 2 });
          synthetic.push({ time: b.time + 30000, open: (b.open + b.close) / 2, high: b.high, low: b.low, close: b.close, volume: b.volume / 2 });
        }
        bars = synthetic.slice(-100);
      }
    } else {
      // other TFs use klines directly
      const tfMap = { '1m':'1m','3m':'3m','5m':'5m','1h':'1h','2h':'2h','3h':'3h','5h':'4h','10h':'8h','1d':'1d','2d':'3d','3d':'3d' };
      const interval = tfMap[tf] || '1m';
      const limit = 200;
      const kl = await getKlines(symbol, interval, limit);
      bars = kl.map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
      mode = interval === '1m' ? 'gerçək' : 'klines';
      if (bars.length > 120) bars = bars.slice(-120);
    }

    // indicators: EMA7/25/99, RSI14, volume SMA20
    const closeArray = bars.map((b) => b.close);
    const volumeArray = bars.map((b) => b.volume);
    function sma(values, period) {
      const out = new Array(values.length).fill(null);
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
      }
      return out;
    }
    function ema(values, period) {
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
    function rsi(values, period = 14) {
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
    const ema7 = ema(closeArray, 7);
    const ema25 = ema(closeArray, 25);
    const ema99 = ema(closeArray, 99);
    const rsi14 = rsi(closeArray, 14);
    const volSma20 = sma(volumeArray, 20);

    const lastIdx = bars.length - 1;
    const lastClose = closeArray[lastIdx];
    const trend = ema7[lastIdx] > ema25[lastIdx] && ema25[lastIdx] > ema99[lastIdx]
      ? 'only-long'
      : ema7[lastIdx] < ema25[lastIdx] && ema25[lastIdx] < ema99[lastIdx]
        ? 'only-short'
        : 'mixed';
    const lastRsi = rsi14[lastIdx];
    const volOk = volSma20[lastIdx] != null && volumeArray[lastIdx] > volSma20[lastIdx];

    let signal = 'Nötr';
    let suggestion = null;
    if (trend !== 'only-short' && lastRsi != null && lastRsi >= 40 && lastRsi <= 65 && volOk) {
      // cross up EMA7: require close > ema7 and prev close <= prev ema7
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
  } catch (err) {
    res.status(500).json({ error: '30s tövsiyələrini hesablamaq mümkün olmadı' });
  }
});

// DeepSeek analysis endpoint
app.get('/api/deepseek', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'SOLUSDT').toUpperCase();
    const tf = (req.query.tf || '30s');

    // helper: build bars for a symbol/timeframe
    async function buildBars(sym, timeframe) {
      if (timeframe === '30s') {
        try {
          const trades = await getAggTrades(sym, 800);
          const byBucket = new Map();
          for (const t of trades) {
            const ts = t.T;
            const bucket = Math.floor(ts / 30000) * 30000;
            const price = parseFloat(t.p);
            const qty = parseFloat(t.q);
            let b = byBucket.get(bucket);
            if (!b) { b = { time: bucket, open: price, high: price, low: price, close: price, volume: qty }; byBucket.set(bucket, b); }
            else { b.high = Math.max(b.high, price); b.low = Math.min(b.low, price); b.close = price; b.volume += qty; }
          }
          return Array.from(byBucket.values()).sort((a, b) => a.time - b.time).slice(-120);
        } catch (e) {
          const kl = await getKlines(sym, '1m', 150);
          const m1 = kl.map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
          const synthetic = [];
          for (const b of m1) {
            synthetic.push({ time: b.time, open: b.open, high: b.high, low: b.low, close: (b.open + b.close) / 2, volume: b.volume / 2 });
            synthetic.push({ time: b.time + 30000, open: (b.open + b.close) / 2, high: b.high, low: b.low, close: b.close, volume: b.volume / 2 });
          }
          return synthetic.slice(-120);
        }
      } else {
        const mapped = timeframe === '5h' ? '4h' : timeframe === '10h' ? '8h' : timeframe;
        const kl = await getKlines(sym, mapped, 200);
        return kl.map((k) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })).slice(-120);
      }
    }

    // primary symbol bars
    const bars = await buildBars(symbol, tf);

    // also include popular majors for context
    const majors = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const extraSymbols = Array.from(new Set([symbol, ...majors]));
    const allBars = {};
    for (const s of extraSymbols) {
      allBars[s] = await buildBars(s, tf);
    }

    const closes = (bars || []).map(b => b.close);
    const last = bars[bars.length - 1];
    const recentBySymbol = Object.fromEntries(
      Object.entries(allBars).map(([s, arr]) => [s, arr.map(b => b.close).slice(-60)])
    );

    const apiKey = 'sk-20cffc24a1f54a12bf20f07623db7859';
    const prompt = `Sən qısa müddətli kripto treyd analitiksən. Zaman çərçivəsi: ${tf}. Seçilmiş simvol: ${symbol}.\n` +
      `Aşağıda bir neçə əsas simvol üçün son 60 bağlanış qiyməti verilir (koma ilə ayrılıb):\n` +
      `${Object.entries(recentBySymbol).map(([s, arr]) => s + ': ' + arr.join(', ')).join('\n')}\n` +
      `Bu simvolları birlikdə nəzərə alaraq ümumi trendi dəyərləndir, seçilmiş simvol üçün qısa skalp strategiyası çıxart: giriş qiyməti, qazanc hədəfi (~+0.5%), zərər dayandır (~-0.3%), və tərəf (long/short). ` +
      `Cavabı Azərbaycan dilində, qısa və actionable bəndlərlə ver.`;

    const resp = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Sən Azərbaycan dilində cavab verən, qısa skalp treydi üzrə analitiksən.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
      stream: false,
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 20000,
    });

    const text = resp.data?.choices?.[0]?.message?.content || 'Analiz tapılmadı.';

    // simple stats for UI
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
    res.json({ analysis: text, symbols: Object.keys(recentBySymbol), stats });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    res.status(500).json({ error: 'DeepSeek analizi alınmadı', status, data });
  }
});

// Login page route
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Direct /index.html access should respect auth
app.get('/index.html', (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test page route
app.get('/test', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  return res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Root route with auth check
app.get('/', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback
app.get('*', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Export for server.cjs
module.exports = app;


