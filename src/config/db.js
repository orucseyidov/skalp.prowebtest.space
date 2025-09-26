const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'skalp',
};

let poolPromise;
async function getPool() {
  if (!poolPromise) {
    poolPromise = mysql.createPool({ ...dbConfig, connectionLimit: 10, waitForConnections: true });
    const pool = await poolPromise;
    // ensure tables
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
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
  }
  return poolPromise;
}

module.exports = { getPool };


