const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'skalp',
};

let poolPromise;
async function getPool() {
  if (!poolPromise) {
    poolPromise = mysql.createPool({ ...dbConfig, connectionLimit: 10, waitForConnections: true });
    const pool = await poolPromise;
    // Database tables are now managed by migrations
    // Run: npm run migrate to create tables
  }
  return poolPromise;
}

module.exports = { getPool, dbConfig };


