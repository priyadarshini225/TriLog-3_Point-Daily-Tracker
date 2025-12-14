import { validationResult } from 'express-validator';
import { validationError } from './errorResponse.js';

/**
 * Middleware to handle validation errors from express-validator
 * Use this before your controller logic to automatically return validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array(), req.requestId);
  }
  next();
};

/**
 * Helper function to check and handle validation errors in controllers
 * Returns true if there are errors (and response is sent), false otherwise
 */
export const checkValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationError(res, errors.array(), req.requestId);
    return true;
  }
  return false;
};
