import express from 'express';
import { body } from 'express-validator';
import { updateSettings, getSettings } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
