const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user.repository');
const asyncHandler = require('../utils/asyncHandler');

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email və şifrə tələb olunur' });
  
  const user = await UserRepository.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'İstifadəçi tapılmadı' });
  
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Yanlış şifrə' });
  
  req.session.user = { id: user.id, full_name: user.full_name, email: user.email };
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


