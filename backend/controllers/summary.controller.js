import { generateMonthlySummaryForUser, getMonthlySummary, listMonthlySummaries } from '../services/summary.service.js';
import { generateWeeklySummaryForUser, getWeeklySummary, listWeeklySummaries } from '../services/weeklySummary.service.js';

// @desc    Get user's summaries
// @route   GET /api/summaries
// @access  Private
export const getSummaries = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 24);
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 60 ? limit : 24;

    const summaries = await listMonthlySummaries({ userId: req.user._id, limit: safeLimit });
    res.json({
      summaries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary for specific month
// @route   GET /api/summaries/:month (YYYY-MM)
// @access  Private
export const getSummary = async (req, res, next) => {
  try {
    const { month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        errorCode: 'INVALID_FORMAT',
        message: 'Month must be in YYYY-MM format',
        requestId: req.requestId
      });
    }

    const summary = await getMonthlySummary({ userId: req.user._id, month });
    if (!summary) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Summary not found for this month',
        requestId: req.requestId,
      });
    }

    res.json({
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate (or re-generate) summary for a month
// @route   POST /api/summaries/generate?month=YYYY-MM&mode=ai|heuristic
// @access  Private
export const generateSummary = async (req, res, next) => {
  try {
    const month = String(req.query.month || '').trim();
    const mode = String(req.query.mode || '').trim();
    if (!/^(\d{4})-(\d{2})$/.test(month)) {
      return res.status(400).json({
        errorCode: 'INVALID_FORMAT',
        message: 'Month must be in YYYY-MM format',
        requestId: req.requestId,
      });
    }

    const summary = await generateMonthlySummaryForUser({ userId: req.user._id, month, upsert: true, mode });
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's weekly summaries
// @route   GET /api/summaries/weekly
// @access  Private
export const getWeeklySummariesHandler = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 24);
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 60 ? limit : 24;

    const summaries = await listWeeklySummaries({ userId: req.user._id, limit: safeLimit });
    res.json({ summaries });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly summary for specific weekStartDate
// @route   GET /api/summaries/weekly/:weekStartDate (YYYY-MM-DD)
// @access  Private
export const getWeeklySummaryHandler = async (req, res, next) => {
  try {
    const { weekStartDate } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
      return res.status(400).json({
        errorCode: 'INVALID_FORMAT',
        message: 'weekStartDate must be in YYYY-MM-DD format',
        requestId: req.requestId,
      });
    }

    const summary = await getWeeklySummary({ userId: req.user._id, weekStartDate });
    if (!summary) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Weekly summary not found for this week',
        requestId: req.requestId,
      });
    }

    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate (or re-generate) weekly summary for a 7-day window ending on a date (usually Sunday)
// @route   POST /api/summaries/weekly/generate?end=YYYY-MM-DD&mode=ai|heuristic
// @access  Private
export const generateWeeklySummaryHandler = async (req, res, next) => {
  try {
    const end = String(req.query.end || '').trim();
    const mode = String(req.query.mode || '').trim();

    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({
        errorCode: 'INVALID_FORMAT',
        message: 'end must be in YYYY-MM-DD format',
        requestId: req.requestId,
      });
    }

    const summary = await generateWeeklySummaryForUser({ userId: req.user._id, end: end || undefined, upsert: true, mode });
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};
