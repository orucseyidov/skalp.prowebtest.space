const UserRepository = require('../repositories/user.repository');
const UserSettingsRepository = require('../repositories/user-settings.repository');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get user profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const user = await UserRepository.findById(userId);
  if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  
  res.json({ success: true, data: user });
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
  
  // Check if email already exists for another user
  const emailExists = await UserRepository.emailExists(email, userId);
  if (emailExists) {
    return res.status(400).json({
      success: false,
      message: 'Bu email artıq istifadə olunur'
    });
  }
  
  const updatedUser = await UserRepository.updateProfile(userId, {
    full_name: String(full_name).trim(),
    email: String(email).trim()
  });
  
  if (!updatedUser) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }
  
  // Update session
  req.session.user.fullName = updatedUser.full_name;
  req.session.user.email = updatedUser.email;
  
  res.json({ success: true, data: updatedUser });
});

/**
 * Get user settings
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  
  // Ensure user_settings record exists
  const settings = await UserSettingsRepository.ensureExists(userId);
  
  res.json({ success: true, data: settings || {} });
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
  
  const updatedSettings = await UserSettingsRepository.update(userId, {
    gpt_token: gpt_token || null,
    gpt_key: gpt_key || null,
    deepseek_token: deepseek_token || null,
    deepseek_key: deepseek_key || null,
    binance_token: binance_token || null,
    binance_key: binance_key || null,
    binance_user_code: binance_user_code || null
  });
  
  res.json({ success: true, data: updatedSettings });
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
  
  // Get current password hash
  const currentHash = await UserRepository.getPasswordHash(userId);
  if (!currentHash) {
    return res.status(400).json({ 
      success: false, 
      message: 'İstifadəçi tapılmadı' 
    });
  }
  
  // Verify old password
  const ok = await bcrypt.compare(String(oldPassword), currentHash);
  if (!ok) {
    return res.status(401).json({ 
      success: false, 
      message: 'Köhnə şifrə yanlışdır' 
    });
  }
  
  // Hash new password and update
  const newHash = await bcrypt.hash(String(newPassword), 10);
  const success = await UserRepository.updatePassword(userId, newHash);
  
  if (!success) {
    return res.status(500).json({ 
      success: false, 
      message: 'Şifrə yenilənmədi' 
    });
  }
  
  res.json({ success: true });
});
