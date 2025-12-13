import { validationResult } from 'express-validator';
import DailyQuestion from '../models/DailyQuestion.model.js';
import DailyAnswer from '../models/DailyAnswer.model.js';
import { assignDailyQuestion } from '../services/question.service.js';

// @desc    Get today's question for user
// @route   GET /api/questions/today
// @access  Private
export const getTodayQuestion = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if question already exists for today
    let question = await DailyQuestion.findOne({ userId, scheduledDate: today });

    // If not, assign a new question
    if (!question) {
      try {
        question = await assignDailyQuestion(userId, req.user.preferences);
      } catch (error) {
        console.error('Failed to assign daily question:', error);
        return res.status(500).json({
          errorCode: 'QUESTION_ASSIGNMENT_FAILED',
          message: 'Failed to assign daily question',
          requestId: req.requestId
        });
      }
    }

    // Check if user has already answered
    const answer = await DailyAnswer.findOne({ userId, questionId: question._id });

    res.json({
      question: {
        id: question._id,
        text: question.questionText,
        category: question.category,
        difficulty: question.difficulty,
        scheduledDate: question.scheduledDate
      },
      answered: !!answer,
      answer: answer ? {
        id: answer._id,
        text: answer.text,
        createdAt: answer.createdAt
      } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answer to question
// @route   POST /api/questions/:id/answer
// @access  Private
export const submitAnswer = async (req, res, next) => {
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

    const { answerText, timeSpent } = req.body;
    const userId = req.user._id;
    const questionId = req.params.id;

    // Verify question exists and belongs to user
    const question = await DailyQuestion.findOne({ _id: questionId, userId });
    if (!question) {
      return res.status(404).json({
        errorCode: 'QUESTION_NOT_FOUND',
        message: 'Question not found',
        requestId: req.requestId
      });
    }

    // Check if already answered
    const existingAnswer = await DailyAnswer.findOne({ userId, questionId });
    if (existingAnswer) {
      return res.status(400).json({
        errorCode: 'ALREADY_ANSWERED',
        message: 'Question already answered',
        requestId: req.requestId
      });
    }

    // Create answer
    const answer = await DailyAnswer.create({
      userId,
      questionId,
      text: answerText,
      timeSpent: timeSpent || 0
    });

    res.status(201).json({
      answerId: answer._id,
      answer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's questions history
// @route   GET /api/questions?limit=20&page=1
// @access  Private
export const getQuestions = async (req, res, next) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const questions = await DailyQuestion.find({ userId })
      .sort({ scheduledDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get answers for these questions
    const questionIds = questions.map(q => q._id);
    const answers = await DailyAnswer.find({ 
      userId, 
      questionId: { $in: questionIds } 
    });

    const answersMap = {};
    answers.forEach(a => {
      answersMap[a.questionId.toString()] = a;
    });

    const questionsWithAnswers = questions.map(q => ({
      id: q._id,
      text: q.questionText,
      category: q.category,
      difficulty: q.difficulty,
      scheduledDate: q.scheduledDate,
      answered: !!answersMap[q._id.toString()],
      answer: answersMap[q._id.toString()] || null
    }));

    const total = await DailyQuestion.countDocuments({ userId });

    res.json({
      questions: questionsWithAnswers,
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
