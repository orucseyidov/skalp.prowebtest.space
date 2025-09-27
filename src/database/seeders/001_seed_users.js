const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { dbConfig } = require('../../config/db');

async function up() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check if users already exist
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
    
    if (existingUsers[0].count > 0) {
      console.log('⏭️  Users already exist, skipping seed');
      return;
    }
    
    // Create sample users
    const users = [
      {
        full_name: 'Oruc Seyidov',
        email: 'oruc@example.com',
        password: 'password123'
      },
      {
        full_name: 'Test User',
        email: 'test@example.com',
        password: 'test123'
      }
    ];
    
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      await connection.execute(
        'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
        [user.full_name, user.email, passwordHash]
      );
      
      console.log(`✅ Created user: ${user.email}`);
    }
    
    // Create user settings for the first user
    const [userId] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['oruc@example.com']
    );
    
    if (userId.length > 0) {
      await connection.execute(
        'INSERT INTO user_settings (user_id, gpt_token, gpt_key, deepseek_token, deepseek_key, binance_token, binance_key, binance_user_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId[0].id, null, null, null, null, null, null, null]
      );
      
      console.log('✅ Created user settings for Oruc Seyidov');
    }
    
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.execute('DELETE FROM user_settings');
    await connection.execute('DELETE FROM users');
    console.log('✅ Removed all seeded users and settings');
  } finally {
    await connection.end();
  }
}

module.exports = { up, down };
