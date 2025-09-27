const cors = require('cors');

/**
 * CORS middleware configuration
 * Allows same origin and localhost development
 */
const corsMiddleware = cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    
    try {
      const url = new URL(origin);
      
      // Allow localhost, 127.0.0.1, and .local domains
      if (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname.endsWith('.local')
      ) {
        return cb(null, true);
      }
      
      // In production, you might want to add your domain here
      // if (url.hostname === 'yourdomain.com') {
      //   return cb(null, true);
      // }
    } catch (e) {
      // Invalid URL
    }
    
    return cb(null, false);
  },
  optionsSuccessStatus: 200,
  credentials: true, // Allow cookies
});

module.exports = corsMiddleware;
