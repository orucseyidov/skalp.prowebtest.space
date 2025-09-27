const { getPool } = require('../config/db');

/**
 * User Settings Repository
 * Handles user settings database operations
 */
class UserSettingsRepository {
  /**
   * Get user settings by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User settings or null
   */
  static async findByUserId(userId) {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Create user settings
   * @param {number} userId - User ID
   * @param {Object} settings - Settings data
   * @returns {Promise<Object>} Created settings
   */
  static async create(userId, settings = {}) {
    const pool = await getPool();
    const {
      gpt_token = null,
      gpt_key = null,
      deepseek_token = null,
      deepseek_key = null,
      binance_token = null,
      binance_key = null,
      binance_user_code = null
    } = settings;
    
    const [result] = await pool.query(
      `INSERT INTO user_settings (user_id, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code]
    );
    
    return await this.findByUserId(userId);
  }

  /**
   * Update user settings
   * @param {number} userId - User ID
   * @param {Object} settings - Settings data
   * @returns {Promise<Object|null>} Updated settings or null
   */
  static async update(userId, settings) {
    const pool = await getPool();
    const {
      gpt_token,
      gpt_key,
      deepseek_token,
      deepseek_key,
      binance_token,
      binance_key,
      binance_user_code
    } = settings;
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    await pool.query(
      `INSERT INTO user_settings (user_id, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         gpt_token = VALUES(gpt_token),
         gpt_key = VALUES(gpt_key),
         deepseek_token = VALUES(deepseek_token),
         deepseek_key = VALUES(deepseek_key),
         binance_token = VALUES(binance_token),
         binance_key = VALUES(binance_key),
         binance_user_code = VALUES(binance_user_code),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code]
    );
    
    return await this.findByUserId(userId);
  }

  /**
   * Ensure user settings exist (create if not exists)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User settings
   */
  static async ensureExists(userId) {
    const pool = await getPool();
    
    // Try to insert, ignore if already exists
    await pool.query(
      'INSERT IGNORE INTO user_settings (user_id) VALUES (?)',
      [userId]
    );
    
    return await this.findByUserId(userId);
  }

  /**
   * Update specific setting
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  static async updateSetting(userId, key, value) {
    const pool = await getPool();
    
    // Ensure settings exist first
    await this.ensureExists(userId);
    
    const [result] = await pool.query(
      `UPDATE user_settings SET ${key} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [value, userId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get setting value
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @returns {Promise<string|null>} Setting value or null
   */
  static async getSetting(userId, key) {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT ${key} FROM user_settings WHERE user_id = ?`,
      [userId]
    );
    return rows[0]?.[key] || null;
  }

  /**
   * Delete user settings
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(userId) {
    const pool = await getPool();
    const [result] = await pool.query(
      'DELETE FROM user_settings WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get all settings for multiple users
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of user settings
   */
  static async findByUserIds(userIds) {
    if (userIds.length === 0) return [];
    
    const pool = await getPool();
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT * FROM user_settings WHERE user_id IN (${placeholders})`,
      userIds
    );
    return rows;
  }
}

module.exports = UserSettingsRepository;
