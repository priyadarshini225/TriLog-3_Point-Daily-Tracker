import express from 'express';
import { body } from 'express-validator';
import { 
  getTodayQuestion, 
  submitAnswer,
  getQuestions 
} from '../controllers/question.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/today', getTodayQuestion);
router.get('/', getQuestions);
router.post('/:id/answer', [
  body('answerText').trim().notEmpty().withMessage('Answer is required').isLength({ max: 2000 }),
  body('timeSpent').optional().isInt({ min: 0 })
], submitAnswer);

export default router;
