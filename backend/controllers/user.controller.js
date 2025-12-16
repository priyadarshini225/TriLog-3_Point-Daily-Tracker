import User from '../models/User.model.js';

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
