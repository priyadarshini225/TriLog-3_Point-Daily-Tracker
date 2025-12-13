import express from 'express';
import { body } from 'express-validator';
import { 
  getRevisions, 
  completeRevision 
} from '../controllers/revision.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', getRevisions);
router.post('/:id/complete', [
  body('responseText').optional().isString().isLength({ max: 1000 }),
  body('confidence').optional().isInt({ min: 0, max: 5 })
], completeRevision);

export default router;
