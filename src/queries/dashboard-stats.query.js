const { getPool } = require('../config/db');

/**
 * Dashboard statistics query
 * Complex query to get user dashboard statistics
 * Only uses existing tables: users, user_settings
 */
class DashboardStatsQuery {
  /**
   * Get user dashboard statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Dashboard statistics
   */
  static async getUserStats(userId) {
    const pool = await getPool();
    
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.created_at,
        us.gpt_token,
        us.gpt_key,
        us.deepseek_token,
        us.deepseek_key,
        us.binance_token,
        us.binance_key,
        us.binance_user_code,
        us.updated_at as settings_updated_at
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = ?
    `;
    
    const [rows] = await pool.query(query, [userId]);
    return rows[0] || null;
  }

  /**
   * Get system-wide statistics
   * @returns {Promise<Object>} System statistics
   */
  static async getSystemStats() {
    const pool = await getPool();
    
    const query = `
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT us.user_id) as users_with_settings,
        COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN u.id END) as new_users_last_30_days,
        COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN u.id END) as new_users_last_7_days
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
    `;
    
    const [rows] = await pool.query(query);
    return rows[0] || {};
  }

  /**
   * Get users with their settings
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Users with settings
   */
  static async getUsersWithSettings(options = {}) {
    const pool = await getPool();
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.created_at,
        us.gpt_token,
        us.gpt_key,
        us.deepseek_token,
        us.deepseek_key,
        us.binance_token,
        us.binance_key,
        us.binance_user_code,
        us.updated_at as settings_updated_at,
        CASE WHEN us.user_id IS NOT NULL THEN 1 ELSE 0 END as has_settings
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.query(query, [limit, offset]);
    return rows;
  }

  /**
   * Get settings statistics
   * @returns {Promise<Object>} Settings statistics
   */
  static async getSettingsStats() {
    const pool = await getPool();
    
    const query = `
      SELECT 
        COUNT(*) as total_settings,
        COUNT(CASE WHEN gpt_token IS NOT NULL THEN 1 END) as users_with_gpt_token,
        COUNT(CASE WHEN gpt_key IS NOT NULL THEN 1 END) as users_with_gpt_key,
        COUNT(CASE WHEN deepseek_token IS NOT NULL THEN 1 END) as users_with_deepseek_token,
        COUNT(CASE WHEN deepseek_key IS NOT NULL THEN 1 END) as users_with_deepseek_key,
        COUNT(CASE WHEN binance_token IS NOT NULL THEN 1 END) as users_with_binance_token,
        COUNT(CASE WHEN binance_key IS NOT NULL THEN 1 END) as users_with_binance_key,
        COUNT(CASE WHEN binance_user_code IS NOT NULL THEN 1 END) as users_with_binance_user_code
      FROM user_settings
    `;
    
    const [rows] = await pool.query(query);
    return rows[0] || {};
  }
}

module.exports = DashboardStatsQuery;
