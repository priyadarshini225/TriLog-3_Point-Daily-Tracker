import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.model.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        requestId: req.requestId
      });
    }

    const { email, password, name, timezone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        errorCode: 'USER_EXISTS',
        message: 'User already exists with this email',
        requestId: req.requestId
      });
    }

    // Create user
    const user = await User.create({
      email,
      passwordHash: password,
      name,
      timezone: timezone || 'UTC'
    });

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      userId: user._id,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        requestId: req.requestId
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        requestId: req.requestId
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        requestId: req.requestId
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        errorCode: 'ACCOUNT_DISABLED',
        message: 'Account is disabled',
        requestId: req.requestId
      });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      userId: user._id,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        errorCode: 'NO_REFRESH_TOKEN',
        message: 'Refresh token is required',
        requestId: req.requestId
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          errorCode: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
          requestId: req.requestId
        });
      }

      const newAccessToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(401).json({
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid refresh token',
        requestId: req.requestId
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        timezone: req.user.timezone,
        preferences: req.user.preferences,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
