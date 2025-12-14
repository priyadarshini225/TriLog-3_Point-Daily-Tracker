import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
export const getSettings = async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      settings: {
        timezone: user.timezone,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user settings
// @route   PUT /api/user/settings
// @access  Private
export const updateSettings = async (req, res, next) => {
  try {
    const { timezone, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (timezone) {
      user.timezone = timezone;
    }

    if (preferences) {
      const current = user.preferences || {};

      const nextPreferences = { ...current };

      // Only copy defined values from incoming preferences.
      for (const [key, value] of Object.entries(preferences || {})) {
        if (value === undefined || value === null) continue;
        nextPreferences[key] = value;
      }

      if (preferences.notificationChannels) {
        nextPreferences.notificationChannels = {
          ...(current.notificationChannels || {}),
          ...(preferences.notificationChannels || {}),
        };
      }

      if (preferences.dndWindow) {
        nextPreferences.dndWindow = {
          ...(current.dndWindow || {}),
          ...(preferences.dndWindow || {}),
        };
      }

      user.preferences = nextPreferences;
    }

    await user.save();

    res.json({
      message: 'Settings updated successfully',
      settings: {
        timezone: user.timezone,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      profile: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        timezone: user.timezone,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) {
      user.name = name.trim();
    }

    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          errorCode: 'EMAIL_EXISTS',
          message: 'Email already in use',
          requestId: req.requestId
        });
      }
      user.email = email.toLowerCase();
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/user/password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
        requestId: req.requestId
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'New password must be at least 6 characters',
        requestId: req.requestId
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        errorCode: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
        requestId: req.requestId
      });
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Import models here to avoid circular dependencies
    const DailyEntry = (await import('../models/DailyEntry.model.js')).default;
    const RevisionSchedule = (await import('../models/RevisionSchedule.model.js')).default;
    const DailyAnswer = (await import('../models/DailyAnswer.model.js')).default;

    // Get total entries
    const totalEntries = await DailyEntry.countDocuments({ userId });

    // Get entries this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const entriesThisMonth = await DailyEntry.countDocuments({
      userId,
      date: { $gte: monthStart, $lte: monthEnd }
    });

    // Get streak (consecutive days with entries)
    const allEntries = await DailyEntry.find({ userId }).select('date').sort({ date: -1 }).lean();
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    if (allEntries.length > 0) {
      let checkDate = new Date(today);
      
      // Allow for today not being done yet
      if (allEntries[0].date !== today) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (const entry of allEntries) {
        const entryDate = entry.date;
        const expectedDate = checkDate.toISOString().split('T')[0];
        
        if (entryDate === expectedDate) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Get revision stats
    const pendingRevisions = await RevisionSchedule.countDocuments({
      userId,
      status: 'pending'
    });

    const completedRevisions = await RevisionSchedule.countDocuments({
      userId,
      status: 'completed'
    });

    // Get questions answered
    const questionsAnswered = await DailyAnswer.countDocuments({ userId });

    res.json({
      stats: {
        totalEntries,
        entriesThisMonth,
        currentStreak,
        pendingRevisions,
        completedRevisions,
        questionsAnswered,
        memberSince: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
