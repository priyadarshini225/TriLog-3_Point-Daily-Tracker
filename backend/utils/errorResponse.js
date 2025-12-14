/**
 * Standardized error response helper to avoid duplication across middleware & controllers
 */

export const errorResponse = (res, statusCode, errorCode, message, details = null, requestId = null) => {
  const response = {
    errorCode,
    message,
    ...(requestId && { requestId })
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

export const validationError = (res, details, requestId) => 
  errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', details, requestId);

export const unauthorizedError = (res, message = 'Not authorized', requestId = null) =>
  errorResponse(res, 401, 'UNAUTHORIZED', message, null, requestId);

export const notFoundError = (res, message = 'Not found', requestId = null) =>
  errorResponse(res, 404, 'NOT_FOUND', message, null, requestId);

export const duplicateError = (res, field, requestId) =>
  errorResponse(res, 400, 'DUPLICATE_ERROR', `${field} already exists`, null, requestId);

export const serverError = (res, message = 'Internal server error', requestId = null) =>
  errorResponse(res, 500, 'SERVER_ERROR', message, null, requestId);
