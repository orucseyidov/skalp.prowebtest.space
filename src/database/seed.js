const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../config/db');

async function createSeedersTable() {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS seeders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seeder VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  
  await connection.end();
}

async function getExecutedSeeders() {
  const connection = await mysql.createConnection(dbConfig);
  
  const [rows] = await connection.execute('SELECT seeder FROM seeders ORDER BY id');
  await connection.end();
  
  return rows.map(row => row.seeder);
}

async function markSeederAsExecuted(seederName) {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(
    'INSERT INTO seeders (seeder) VALUES (?)',
    [seederName]
  );
  
  await connection.end();
}

async function markSeederAsRolledBack(seederName) {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(
    'DELETE FROM seeders WHERE seeder = ?',
    [seederName]
  );
  
  await connection.end();
}

async function runSeeders() {
  try {
    console.log('🌱 Starting seeders...');
    
    // Check if database exists
    try {
      await createSeedersTable();
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('⚠️  Database does not exist. Please create the database first.');
        console.log('   Create database: CREATE DATABASE skalp;');
        return;
      }
      throw error;
    }
    
    const seedersDir = path.join(__dirname, 'seeders');
    const seederFiles = fs.readdirSync(seedersDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    const executedSeeders = await getExecutedSeeders();
    
    for (const file of seederFiles) {
      const seederName = file.replace('.js', '');
      
      if (executedSeeders.includes(seederName)) {
        console.log(`⏭️  Skipping ${seederName} (already executed)`);
        continue;
      }
      
      console.log(`🌱 Running seeder: ${seederName}`);
      
      const seeder = require(path.join(seedersDir, file));
      await seeder.up();
      await markSeederAsExecuted(seederName);
      
      console.log(`✅ Seeder ${seederName} completed`);
    }
    
    console.log('🎉 All seeders completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function rollbackSeeders() {
  try {
    console.log('🔄 Rolling back seeders...');
    
    const executedSeeders = await getExecutedSeeders();
    
    if (executedSeeders.length === 0) {
      console.log('ℹ️  No seeders to rollback');
      return;
    }
    
    // Rollback in reverse order
    const seedersDir = path.join(__dirname, 'seeders');
    const seederFiles = fs.readdirSync(seedersDir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .reverse();
    
    for (const file of seederFiles) {
      const seederName = file.replace('.js', '');
      
      if (!executedSeeders.includes(seederName)) {
        continue;
      }
      
      console.log(`🔄 Rolling back seeder: ${seederName}`);
      
      const seeder = require(path.join(seedersDir, file));
      await seeder.down();
      await markSeederAsRolledBack(seederName);
      
      console.log(`✅ Seeder ${seederName} rolled back`);
    }
    
    console.log('🎉 All seeders rolled back successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'up') {
  runSeeders();
} else if (command === 'down') {
  rollbackSeeders();
} else {
  console.log('Usage: node seed.js [up|down]');
  console.log('  up   - Run all pending seeders');
  console.log('  down - Rollback all seeders');
  process.exit(1);
}
