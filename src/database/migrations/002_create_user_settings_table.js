const mysql = require('mysql2/promise');
const { dbConfig } = require('../../config/db');

async function up() {
  const connection = await mysql.createConnection(dbConfig);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.end();
}

async function down() {
  const connection = await mysql.createConnection(dbConfig);

  await connection.execute(`DROP TABLE IF EXISTS user_settings`);
  await connection.end();
}

module.exports = { up, down };
