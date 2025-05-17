/**
 * Global error handler middleware
 * Provides consistent error responses to the frontend
 */
const errorHandler = (err, req, res, next) => {
  // Set default error code and status
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.status = 'fail';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.status = 'fail';
    err.message = 'Invalid or expired token. Please log in again.';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    err.statusCode = 400;
    err.status = 'fail';
    err.message = 'A record with this information already exists.';
  }

  // Development error response (more details)
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } 
  // Production error response (less details)
  else {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message
      });
    } 
    // Programming or other unknown error: don't leak error details
    else {
      // Log error for developers
      console.error('ERROR 💥', err);
      
      // Send generic message
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }
};

module.exports = errorHandler;
