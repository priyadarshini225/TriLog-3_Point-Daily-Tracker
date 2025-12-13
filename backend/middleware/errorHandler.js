export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
      requestId: req.requestId
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      errorCode: 'DUPLICATE_ERROR',
      message: `${field} already exists`,
      requestId: req.requestId
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid token',
      requestId: req.requestId
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      errorCode: 'TOKEN_EXPIRED',
      message: 'Token expired',
      requestId: req.requestId
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    errorCode: err.errorCode || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    requestId: req.requestId,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
