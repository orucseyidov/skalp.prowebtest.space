const bcrypt = require('bcrypt');
const { getPool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email və şifrə tələb olunur' });
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'İstifadəçi tapılmadı' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Yanlış şifrə' });
  req.session.user = { id: user.id, fullName: user.full_name, email: user.email };
  res.json({ ok: true, user: req.session.user });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ user: null });
  res.json({ user: req.session.user });
});


