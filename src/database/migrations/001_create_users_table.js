const mysql = require('mysql2/promise');
const { dbConfig } = require('../../config/db');

async function up() {
  const connection = await mysql.createConnection(dbConfig);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.end();
}

async function down() {
  const connection = await mysql.createConnection(dbConfig);

  await connection.execute(`DROP TABLE IF EXISTS users`);
  await connection.end();
}

module.exports = { up, down };
