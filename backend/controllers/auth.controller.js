import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { generateToken, generateRefreshToken } from '../utils/tokenUtils.js';
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail } from '../services/email.service.js';

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
      timezone: timezone || 'UTC',
      isEmailVerified: false
    });

    // Generate verification token
    const verificationToken = generateVerificationToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email (don't block registration if this fails)
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration
    }

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
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified
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
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified
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
        createdAt: req.user.createdAt,
        isEmailVerified: req.user.isEmailVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token',
        requestId: req.requestId
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email (don't block verification if this fails)
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        errorCode: 'USER_NOT_FOUND',
        message: 'User not found',
        requestId: req.requestId
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        errorCode: 'ALREADY_VERIFIED',
        message: 'Email is already verified',
        requestId: req.requestId
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        errorCode: 'EMAIL_SEND_FAILED',
        message: 'Failed to send verification email. Please try again later.',
        requestId: req.requestId
      });
    }
  } catch (error) {
    next(error);
  }
};
