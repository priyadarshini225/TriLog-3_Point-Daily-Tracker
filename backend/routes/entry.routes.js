import express from 'express';
import { body, query } from 'express-validator';
import { 
  createEntry, 
  getEntries, 
  getEntry, 
  updateEntry, 
  deleteEntry 
} from '../controllers/entry.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const createEntryValidation = [
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('completed').trim().notEmpty().withMessage('Completed field is required').isLength({ max: 500 }),
  body('learned').trim().notEmpty().withMessage('Learned field is required').isLength({ max: 500 }),
  body('reviseLater').optional().isArray(),
  body('tags').optional().isArray()
];

// Routes
router.get('/', getEntries);
router.post('/', createEntryValidation, createEntry);
router.get('/:id', getEntry);
router.put('/:id', createEntryValidation, updateEntry);
router.delete('/:id', deleteEntry);

export default router;
