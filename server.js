require('dotenv').config();
const express = require('express');
const path = require('path');
const edge = require('express-edge');
const mysql = require('mysql2/promise');

// Middlewares
const corsMiddleware = require('./src/middlewares/cors');
const { rateLimitMiddleware } = require('./src/middlewares/rateLimit');
const sessionMiddleware = require('./src/middlewares/session');
const ErrorHandler = require('./src/exceptions/ErrorHandler');

// Routes
const routes = require('./src/routes');

// __dirname is already available in CommonJS

const app = express();
const PORT = process.env.PORT || 3000;

// Edge template engine
app.use(edge);
app.set('views', path.join(__dirname, 'src/views'));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares (order matters!)
app.use(corsMiddleware);           // CORS first
app.use(rateLimitMiddleware);      // Rate limiting
app.use(sessionMiddleware);        // Sessions

// Static files (do not auto-serve index.html to enforce auth)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Database (MySQL) setup
const { dbConfig } = require('./src/config/db');

let pool;
async function initDb() {
  pool = await mysql.createPool({
    ...dbConfig,
    connectionLimit: 10,
    waitForConnections: true,
  });
  // Database tables are now managed by migrations
  // Run: npm run migrate to create tables

  // Database seeding is now managed by seeders
  // Run: npm run seed to seed default data
}
initDb().catch((e) => console.error('DB init failed', e));

// Mount all routes
app.use('/', routes);

// Error handling (must be last!)
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.handle);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Export for server.cjs
module.exports = app;


