import mongoose from 'mongoose';

const weeklySummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // YYYY-MM-DD (Monday recommended, but we store whatever start computed)
    weekStartDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'weekStartDate must be in YYYY-MM-DD format'],
      index: true,
    },

    // YYYY-MM-DD (typically Sunday)
    weekEndDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'weekEndDate must be in YYYY-MM-DD format'],
      index: true,
    },

    period: {
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
    },

    stats: {
      entryDays: { type: Number, default: 0 },
      reviseItemsCreated: { type: Number, default: 0 },
      revisionsScheduled: { type: Number, default: 0 },
      revisionsCompleted: { type: Number, default: 0 },
      revisionsCompletionRate: { type: Number, default: 0 },
      questionsAnswered: { type: Number, default: 0 },
    },

    narrative: {
      type: String,
      default: '',
      maxlength: 12000,
    },

    keyLearnings: [{ type: String }],

    signals: {
      subjects: [{ type: String, trim: true }],
      algorithms: [{ type: String, trim: true }],
      platforms: [{ type: String, trim: true }],
      topics: [{ type: String, trim: true }],
      highlights: [{ type: String }],
    },

    evaluation: {
      whatWorked: [{ type: String }],
      whatToImprove: [{ type: String }],
      nextWeekFocus: [{ type: String }],
      score: { type: Number, min: 0, max: 10, default: 0 },
    },

    recommendations: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        reason: { type: String, required: true },
        tags: [{ type: String, trim: true }],
        score: { type: Number, default: 0 },
      },
    ],

    generator: {
      type: String,
      enum: ['heuristic', 'ai-rag'],
      default: 'heuristic',
    },

    emailedAt: {
      type: Date,
      default: null,
      index: true,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

weeklySummarySchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });
weeklySummarySchema.index({ userId: 1, weekEndDate: 1 });

const WeeklySummary = mongoose.model('WeeklySummary', weeklySummarySchema);

export default WeeklySummary;
