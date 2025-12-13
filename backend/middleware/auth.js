import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        errorCode: 'NO_TOKEN',
        message: 'Not authorized, no token provided',
        requestId: req.requestId
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!req.user) {
        return res.status(401).json({
          errorCode: 'USER_NOT_FOUND',
          message: 'User not found',
          requestId: req.requestId
        });
      }

      if (req.user.status !== 'active') {
        return res.status(401).json({
          errorCode: 'ACCOUNT_DISABLED',
          message: 'Account is disabled',
          requestId: req.requestId
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        errorCode: 'INVALID_TOKEN',
        message: 'Not authorized, invalid token',
        requestId: req.requestId
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: 'Not authorized to access this resource',
        requestId: req.requestId
      });
    }
    next();
  };
};
