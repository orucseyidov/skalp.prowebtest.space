const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per IP
 */
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // Limit each IP to 120 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Çox sayda sorğu göndərilir. Zəhmət olmasa bir az gözləyin.',
    retryAfter: '60 saniyə'
  },
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: false,
  // Skip rate limiting for failed requests
  skipFailedRequests: false,
});

/**
 * Strict rate limiting for auth endpoints
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Çox sayda giriş cəhdi. 15 dəqiqə gözləyin.',
    retryAfter: '15 dəqiqə'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * API rate limiting (more lenient for API calls)
 */
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'API limit aşıldı. Zəhmət olmasa bir az gözləyin.',
    retryAfter: '60 saniyə'
  },
});

module.exports = {
  rateLimitMiddleware,
  authRateLimit,
  apiRateLimit
};
