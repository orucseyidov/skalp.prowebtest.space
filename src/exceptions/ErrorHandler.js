const HttpException = require('./HttpException');
const NotFoundException = require('./NotFoundException');

/**
 * Global error handler middleware
 * Handles all errors and exceptions in the application
 */
class ErrorHandler {
  /**
   * Main error handler middleware
   */
  static handle(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      const message = 'Resource not found';
      error = new NotFoundException(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      const message = 'Duplicate field value entered';
      error = new HttpException(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error = new HttpException(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      const message = 'Invalid token';
      error = new HttpException(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
      const message = 'Token expired';
      error = new HttpException(message, 401);
    }

    // MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
      const message = 'Duplicate entry';
      error = new HttpException(message, 400);
    }

    if (err.code === 'ER_NO_SUCH_TABLE') {
      const message = 'Database table not found';
      error = new HttpException(message, 500);
    }

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      const message = 'Database access denied';
      error = new HttpException(message, 500);
    }

    // Rate limit errors
    if (err.statusCode === 429) {
      const message = 'Too many requests';
      error = new HttpException(message, 429);
    }

    // Default to 500 server error
    if (!(error instanceof HttpException)) {
      error = new HttpException(
        process.env.NODE_ENV === 'production' 
          ? 'Server Error' 
          : err.message, 
        500
      );
    }

    // Send error response
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error
      })
    });
  }

  /**
   * Handle 404 errors
   */
  static notFound(req, res, next) {
    const error = new NotFoundException(`Route ${req.originalUrl} not found`);
    next(error);
  }

  /**
   * Handle async errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException() {
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection() {
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      process.exit(1);
    });
  }
}

module.exports = ErrorHandler;
