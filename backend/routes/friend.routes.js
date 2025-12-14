import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
  getFriends,
  getFriendRequests,
  searchUsers,
  getFriendProfile,
  getLeaderboard
} from '../controllers/friend.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getFriends);
router.get('/requests', getFriendRequests);
router.get('/search', searchUsers);
router.get('/leaderboard', getLeaderboard);
router.get('/profile/:userId', getFriendProfile);
router.post('/request/:userId', sendFriendRequest);
router.put('/accept/:friendshipId', acceptFriendRequest);
router.put('/reject/:friendshipId', rejectFriendRequest);
router.delete('/:friendshipId', unfriend);

export default router;
