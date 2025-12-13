import { validationResult } from 'express-validator';
import RevisionSchedule from '../models/RevisionSchedule.model.js';

// @desc    Get revisions for user
// @route   GET /api/revisions?status=pending&limit=20
// @access  Private
export const getRevisions = async (req, res, next) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { userId };
    
    if (status) {
      query.status = status;
    } else {
      // Default to pending and notified revisions
      query.status = { $in: ['pending', 'notified'] };
    }

    const revisions = await RevisionSchedule.find(query)
      .sort({ scheduledAt: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('entryId', 'date completed learned');

    const total = await RevisionSchedule.countDocuments(query);

    res.json({
      revisions,
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

// @desc    Complete a revision
// @route   POST /api/revisions/:id/complete
// @access  Private
export const completeRevision = async (req, res, next) => {
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

    const { responseText, confidence } = req.body;
    const userId = req.user._id;
    const revisionId = req.params.id;

    const revision = await RevisionSchedule.findOne({
      _id: revisionId,
      userId
    });

    if (!revision) {
      return res.status(404).json({
        errorCode: 'REVISION_NOT_FOUND',
        message: 'Revision not found',
        requestId: req.requestId
      });
    }

    if (revision.status === 'completed') {
      return res.status(400).json({
        errorCode: 'ALREADY_COMPLETED',
        message: 'Revision already completed',
        requestId: req.requestId
      });
    }

    revision.status = 'completed';
    revision.completedAt = new Date();
    revision.responseText = responseText;
    revision.confidence = confidence;

    await revision.save();

    res.json({
      message: 'Revision completed successfully',
      revision
    });
  } catch (error) {
    next(error);
  }
};
