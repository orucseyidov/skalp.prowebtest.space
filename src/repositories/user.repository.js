const { getPool } = require('../config/db');

/**
 * User Repository
 * Handles simple user database operations
 */
class UserRepository {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT id, full_name, email, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @param {string} userData.full_name - Full name
   * @param {string} userData.email - Email
   * @param {string} userData.password_hash - Password hash
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    const pool = await getPool();
    const { full_name, email, password_hash } = userData;
    
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, password_hash]
    );
    
    return await this.findById(result.insertId);
  }

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {Object} userData - User data
   * @param {string} userData.full_name - Full name
   * @param {string} userData.email - Email
   * @returns {Promise<Object|null>} Updated user or null
   */
  static async updateProfile(id, userData) {
    const pool = await getPool();
    const { full_name, email } = userData;
    
    await pool.query(
      'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
      [full_name, email, id]
    );
    
    return await this.findById(id);
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} password_hash - New password hash
   * @returns {Promise<boolean>} Success status
   */
  static async updatePassword(id, password_hash) {
    const pool = await getPool();
    const [result] = await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get user password hash
   * @param {number} id - User ID
   * @returns {Promise<string|null>} Password hash or null
   */
  static async getPasswordHash(id) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [id]);
    return rows[0]?.password_hash || null;
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - User ID to exclude from check
   * @returns {Promise<boolean>} True if email exists
   */
  static async emailExists(email, excludeId = null) {
    const pool = await getPool();
    let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const params = [email];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows[0].count > 0;
  }

  /**
   * Get all users with pagination
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Paginated users
   */
  static async findAll({ page = 1, limit = 10 } = {}) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;
    
    // Get users
    const [rows] = await pool.query(
      'SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    return {
      items: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = UserRepository;


