const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../config/db');

async function createMigrationsTable() {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  
  await connection.end();
}

async function getExecutedMigrations() {
  const connection = await mysql.createConnection(dbConfig);
  
  const [rows] = await connection.execute('SELECT migration FROM migrations ORDER BY id');
  await connection.end();
  
  return rows.map(row => row.migration);
}

async function markMigrationAsExecuted(migrationName) {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(
    'INSERT INTO migrations (migration) VALUES (?)',
    [migrationName]
  );
  
  await connection.end();
}

async function markMigrationAsRolledBack(migrationName) {
  const connection = await mysql.createConnection(dbConfig);
  
  await connection.execute(
    'DELETE FROM migrations WHERE migration = ?',
    [migrationName]
  );
  
  await connection.end();
}

async function runMigrations() {
  try {
    console.log('🔄 Starting migrations...');
    
    // Check if database exists
    try {
      await createMigrationsTable();
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        console.log('⚠️  Database does not exist. Please create the database first.');
        console.log('   Create database: CREATE DATABASE skalp;');
        return;
      }
      throw error;
    }
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    const executedMigrations = await getExecutedMigrations();
    
    for (const file of migrationFiles) {
      const migrationName = file.replace('.js', '');
      
      if (executedMigrations.includes(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already executed)`);
        continue;
      }
      
      console.log(`🚀 Running migration: ${migrationName}`);
      
      const migration = require(path.join(migrationsDir, file));
      await migration.up();
      await markMigrationAsExecuted(migrationName);
      
      console.log(`✅ Migration ${migrationName} completed`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function rollbackMigrations() {
  try {
    console.log('🔄 Rolling back migrations...');
    
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }
    
    // Rollback in reverse order
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .reverse();
    
    for (const file of migrationFiles) {
      const migrationName = file.replace('.js', '');
      
      if (!executedMigrations.includes(migrationName)) {
        continue;
      }
      
      console.log(`🔄 Rolling back migration: ${migrationName}`);
      
      const migration = require(path.join(migrationsDir, file));
      await migration.down();
      await markMigrationAsRolledBack(migrationName);
      
      console.log(`✅ Migration ${migrationName} rolled back`);
    }
    
    console.log('🎉 All migrations rolled back successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'up') {
  runMigrations();
} else if (command === 'down') {
  rollbackMigrations();
} else {
  console.log('Usage: node migrate.js [up|down]');
  console.log('  up   - Run all pending migrations');
  console.log('  down - Rollback all migrations');
  process.exit(1);
}
