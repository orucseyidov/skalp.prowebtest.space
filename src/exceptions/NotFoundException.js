const HttpException = require('./HttpException');

/**
 * 404 Not Found Exception
 * Thrown when a requested resource is not found
 */
class NotFoundException extends HttpException {
  constructor(message = 'Resource not found', resource = null) {
    super(message, 404);
    this.resource = resource;
  }
  
  toResponse() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      resource: this.resource
    };
  }
}

module.exports = NotFoundException;
