const session = require('express-session');

/**
 * Session middleware configuration
 * Handles user sessions and authentication state
 */
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'skalp_local_secret',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'lax' // CSRF protection
  },
  name: 'skalp.sid', // Custom session name
  rolling: true, // Reset expiration on activity
});

module.exports = sessionMiddleware;
