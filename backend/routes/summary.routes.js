import express from 'express';
import {
	generateSummary,
	getSummaries,
	getSummary,
	getWeeklySummariesHandler,
	getWeeklySummaryHandler,
	generateWeeklySummaryHandler,
} from '../controllers/summary.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', getSummaries);
router.post('/generate', generateSummary);

// Weekly summaries
router.get('/weekly', getWeeklySummariesHandler);
router.post('/weekly/generate', generateWeeklySummaryHandler);
router.get('/weekly/:weekStartDate', getWeeklySummaryHandler);

router.get('/:month', getSummary); // month in YYYY-MM format

export default router;
