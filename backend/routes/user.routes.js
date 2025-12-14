import express from 'express';
import { body } from 'express-validator';
import { 
  getSettings, 
  updateSettings,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserStats
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required')
], updateUserProfile);

// Password change
router.put('/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], changePassword);

// Statistics
router.get('/stats', getUserStats);

export default router;
