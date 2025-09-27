const { getPool } = require('../config/db');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get user profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const pool = await getPool();
  const [rows] = await pool.query('SELECT id, full_name, email, created_at FROM users WHERE id = ?', [userId]);
  const data = rows[0];
  res.json({ success: true, data });
});

/**
 * Update user profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const { full_name, email } = req.body || {};
  
  if (!full_name || !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'full_name və email tələb olunur' 
    });
  }
  
  const pool = await getPool();
  await pool.query('UPDATE users SET full_name=?, email=? WHERE id=?', [
    String(full_name).trim(), 
    String(email).trim(), 
    userId
  ]);
  
  // Update session
  req.session.user.fullName = String(full_name).trim();
  req.session.user.email = String(email).trim();
  
  res.json({ success: true });
});

/**
 * Get user settings
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const pool = await getPool();
  
  // Ensure user_settings record exists
  await pool.query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);
  
  const [rows] = await pool.query(
    'SELECT gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code FROM user_settings WHERE user_id=?', 
    [userId]
  );
  
  res.json({ success: true, data: rows[0] || {} });
});

/**
 * Update user settings
 */
exports.updateSettings = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const { 
    gpt_token, 
    gpt_key, 
    deepseek_token, 
    deepseek_key, 
    binance_token, 
    binance_key, 
    binance_user_code 
  } = req.body || {};
  
  const pool = await getPool();
  await pool.query(
    `INSERT INTO user_settings (user_id, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE 
       gpt_token=VALUES(gpt_token), 
       gpt_key=VALUES(gpt_key), 
       deepseek_token=VALUES(deepseek_token), 
       deepseek_key=VALUES(deepseek_key), 
       binance_token=VALUES(binance_token), 
       binance_key=VALUES(binance_key), 
       binance_user_code=VALUES(binance_user_code)`,
    [
      userId, 
      gpt_token || null, 
      gpt_key || null, 
      deepseek_token || null, 
      deepseek_key || null, 
      binance_token || null, 
      binance_key || null, 
      binance_user_code || null
    ]
  );
  
  res.json({ success: true });
});

/**
 * Change user password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const { oldPassword, newPassword, confirmPassword } = req.body || {};
  
  // Validation
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Bütün şifrə sahələri tələb olunur' 
    });
  }
  
  if (String(newPassword) !== String(confirmPassword)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Yeni şifrələr uyğun deyil' 
    });
  }
  
  if (String(newPassword).length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'Yeni şifrə ən az 6 simvol olmalıdır' 
    });
  }
  
  const pool = await getPool();
  
  // Get current password hash
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id=?', [userId]);
  const hash = rows[0]?.password_hash;
  
  if (!hash) {
    return res.status(400).json({ 
      success: false, 
      message: 'İstifadəçi tapılmadı' 
    });
  }
  
  // Verify old password
  const ok = await bcrypt.compare(String(oldPassword), hash);
  if (!ok) {
    return res.status(401).json({ 
      success: false, 
      message: 'Köhnə şifrə yanlışdır' 
    });
  }
  
  // Hash new password and update
  const newHash = await bcrypt.hash(String(newPassword), 10);
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [newHash, userId]);
  
  res.json({ success: true });
});
