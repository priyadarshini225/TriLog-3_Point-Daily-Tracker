import Friendship from '../models/Friendship.model.js';
import User from '../models/User.model.js';
import DailyEntry from '../models/DailyEntry.model.js';
import DailySchedule from '../models/DailySchedule.model.js';
import RevisionSchedule from '../models/RevisionSchedule.model.js';

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
const sendFriendRequest = async (req, res, next) => {
  try {
    const recipientId = req.params.userId;
    const requesterId = req.user._id;

    if (recipientId === requesterId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing friendship
    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already friends'
        });
      } else if (existing.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Friend request already sent'
        });
      } else if (existing.status === 'blocked') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send friend request'
        });
      }
    }

    const friendship = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: friendship
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:friendshipId
// @access  Private
const acceptFriendRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Friend request already responded to'
      });
    }

    friendship.status = 'accepted';
    friendship.respondedAt = Date.now();
    await friendship.save();

    res.status(200).json({
      success: true,
      data: friendship
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject friend request
// @route   PUT /api/friends/reject/:friendshipId
// @access  Private
const rejectFriendRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await friendship.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unfriend a user
// @route   DELETE /api/friends/:friendshipId
// @access  Private
const unfriend = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }

    const userId = req.user._id.toString();
    if (friendship.requester.toString() !== userId && friendship.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await friendship.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Friend removed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res, next) => {
  try {
    const friends = await Friendship.getFriendsList(req.user._id);

    res.status(200).json({
      success: true,
      data: friends
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user._id,
      status: 'pending'
    }).populate('requester', 'name email').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by name or email
// @route   GET /api/friends/search?q=query
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('name email').limit(20);

    // Check friendship status for each user
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const friendship = await Friendship.findOne({
        $or: [
          { requester: req.user._id, recipient: user._id },
          { requester: user._id, recipient: req.user._id }
        ]
      });

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        friendshipStatus: friendship ? friendship.status : 'none',
        friendshipId: friendship ? friendship._id : null
      };
    }));

    res.status(200).json({
      success: true,
      data: usersWithStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get friend profile with stats
// @route   GET /api/friends/profile/:userId
// @access  Private
const getFriendProfile = async (req, res, next) => {
  try {
    const friendId = req.params.userId;

    // Check if they are friends
    const areFriends = await Friendship.areFriends(req.user._id, friendId);
    if (!areFriends) {
      return res.status(403).json({
        success: false,
        message: 'You can only view profiles of your friends'
      });
    }

    const friend = await User.findById(friendId).select('name email createdAt');
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get stats
    const totalEntries = await DailyEntry.countDocuments({ userId: friendId });
    
    const schedules = await DailySchedule.find({ userId: friendId });
    const totalProductiveHours = schedules.reduce((sum, s) => sum + (s.productiveHours || 0), 0);
    
    const revisions = await RevisionSchedule.find({ userId: friendId });
    const totalRevisions = revisions.reduce((sum, r) => sum + (r.revisionHistory?.length || 0), 0);

    // Recent entries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEntries = await DailyEntry.find({
      userId: friendId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 }).limit(7);

    // Recent schedules (last 7 days including today)
    const recentSchedules = await DailySchedule.find({
      userId: friendId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 }).limit(7);

    // Recent revisions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRevisions = await RevisionSchedule.find({
      userId: friendId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        user: friend,
        stats: {
          totalEntries,
          totalProductiveHours: Math.round(totalProductiveHours * 10) / 10,
          totalRevisions,
          memberSince: friend.createdAt
        },
        recentEntries,
        recentSchedules,
        recentRevisions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard
// @route   GET /api/friends/leaderboard
// @access  Private
const getLeaderboard = async (req, res, next) => {
  try {
    const friends = await Friendship.getFriendsList(req.user._id);
    const friendIds = friends.map(f => f.friendId);
    friendIds.push(req.user._id); // Include current user

    // Get stats for all friends
    const leaderboardData = await Promise.all(friendIds.map(async (userId) => {
      const user = await User.findById(userId).select('name email');
      const totalEntries = await DailyEntry.countDocuments({ userId });
      
      const schedules = await DailySchedule.find({ userId });
      const totalProductiveHours = schedules.reduce((sum, s) => sum + (s.productiveHours || 0), 0);
      
      const revisions = await RevisionSchedule.find({ userId });
      const totalRevisions = revisions.reduce((sum, r) => sum + (r.revisionHistory?.length || 0), 0);

      // Calculate current streak
      const entries = await DailyEntry.find({ userId }).sort({ date: -1 });
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const entry of entries) {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else {
          break;
        }
      }

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        totalEntries,
        totalProductiveHours: Math.round(totalProductiveHours * 10) / 10,
        totalRevisions,
        streak,
        isCurrentUser: userId.toString() === req.user._id.toString()
      };
    }));

    // Sort by total entries (can be changed to any metric)
    leaderboardData.sort((a, b) => b.totalEntries - a.totalEntries);

    res.status(200).json({
      success: true,
      data: leaderboardData
    });
  } catch (error) {
    next(error);
  }
};

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
  getFriends,
  getFriendRequests,
  searchUsers,
  getFriendProfile,
  getLeaderboard
};
