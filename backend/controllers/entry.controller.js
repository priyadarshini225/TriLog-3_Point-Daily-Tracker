import { validationResult } from 'express-validator';
import DailyEntry from '../models/DailyEntry.model.js';
import { scheduleRevisions } from '../services/revision.service.js';

// @desc    Get entries for user (with date filter)
// @route   GET /api/entries?date=YYYY-MM-DD&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
export const getEntries = async (req, res, next) => {
  try {
    const { date, startDate, endDate, limit = 30, page = 1 } = req.query;
    const userId = req.user._id;

    let query = { userId };

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const entries = await DailyEntry.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('questionId', 'questionText category')
      .populate('answerId', 'text');

    const total = await DailyEntry.countDocuments(query);

    res.json({
      entries,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new entry
// @route   POST /api/entries
// @access  Private
export const createEntry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        requestId: req.requestId
      });
    }

    const { date, completed, learned, reviseLater, tags } = req.body;
    const userId = req.user._id;

    console.log('Creating entry with data:', { date, completed, learned, reviseLater, tags });

    // Check if entry already exists for this date
    const existingEntry = await DailyEntry.findOne({ userId, date });
    if (existingEntry) {
      return res.status(400).json({
        errorCode: 'ENTRY_EXISTS',
        message: 'Entry already exists for this date',
        requestId: req.requestId
      });
    }

    // Generate IDs for revision items
    const reviseItems = (reviseLater || []).map((item, index) => ({
      id: `${Date.now()}_${index}`,
      text: item.text,
      tags: item.tags || []
    }));

    // Create entry
    const entry = await DailyEntry.create({
      userId,
      date,
      completed,
      learned,
      reviseLater: reviseItems,
      tags: tags || []
    });

    // Schedule revisions asynchronously
    let revisionScheduleIds = [];
    if (reviseItems.length > 0) {
      try {
        revisionScheduleIds = await scheduleRevisions(entry);
      } catch (revisionError) {
        console.error('Failed to schedule revisions:', revisionError);
        // Don't fail the entry creation if revision scheduling fails
      }
    }

    res.status(201).json({
      entryId: entry._id,
      entry,
      revisionScheduleIds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single entry
// @route   GET /api/entries/:id
// @access  Private
export const getEntry = async (req, res, next) => {
  try {
    const entry = await DailyEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('questionId')
      .populate('answerId');

    if (!entry) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Entry not found',
        requestId: req.requestId
      });
    }

    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Update entry
// @route   PUT /api/entries/:id
// @access  Private
export const updateEntry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
        requestId: req.requestId
      });
    }

    const entry = await DailyEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Entry not found',
        requestId: req.requestId
      });
    }

    const { completed, learned, reviseLater, tags } = req.body;

    // Track edit history
    const editHistory = entry.meta?.editHistory || [];
    if (completed && completed !== entry.completed) {
      editHistory.push({ editedAt: new Date(), field: 'completed' });
    }
    if (learned && learned !== entry.learned) {
      editHistory.push({ editedAt: new Date(), field: 'learned' });
    }

    // Update fields
    if (completed !== undefined) entry.completed = completed;
    if (learned !== undefined) entry.learned = learned;
    if (tags !== undefined) entry.tags = tags;
    
    entry.meta = {
      ...entry.meta,
      editHistory
    };

    // Handle reviseLater updates
    if (reviseLater !== undefined) {
      // Process the incoming reviseLater array
      const processedItems = reviseLater.map((item, index) => {
        if (typeof item === 'string') {
          // If it's just a string, create a new item
          return {
            id: `${Date.now()}_${index}`,
            text: item,
            tags: []
          };
        } else if (item.id) {
          // Keep existing items with IDs
          return item;
        } else {
          // New items without IDs
          return {
            id: `${Date.now()}_${index}`,
            text: item.text || item,
            tags: item.tags || []
          };
        }
      });

      // Find truly new items (not in original entry)
      const existingIds = new Set(entry.reviseLater.map(item => item.id));
      const newItems = processedItems.filter(item => !existingIds.has(item.id));

      entry.reviseLater = processedItems;

      // Schedule revisions for new items only
      if (newItems.length > 0) {
        try {
          await scheduleRevisions(entry, newItems);
        } catch (revisionError) {
          console.error('Failed to schedule revisions:', revisionError);
        }
      }
    }

    await entry.save();

    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete entry (soft delete)
// @route   DELETE /api/entries/:id
// @access  Private
export const deleteEntry = async (req, res, next) => {
  try {
    const entry = await DailyEntry.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        errorCode: 'NOT_FOUND',
        message: 'Entry not found',
        requestId: req.requestId
      });
    }

    await entry.deleteOne();

    res.json({
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
