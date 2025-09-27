/**
 * Base HTTP Exception class
 * All custom exceptions should extend this class
 */
class HttpException extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Convert exception to JSON
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      isOperational: this.isOperational
    };
  }
  
  /**
   * Convert exception to user-friendly response
   */
  toResponse() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp
    };
  }
}

module.exports = HttpException;
