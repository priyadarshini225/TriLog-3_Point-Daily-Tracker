import mongoose from 'mongoose';

const monthlySummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // YYYY-MM
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
      index: true,
    },

    period: {
      startDate: { type: String, required: true }, // YYYY-MM-DD
      endDate: { type: String, required: true }, // YYYY-MM-DD
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
      nextMonthFocus: [{ type: String }],
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

    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

monthlySummarySchema.index({ userId: 1, month: 1 }, { unique: true });

const MonthlySummary = mongoose.model('MonthlySummary', monthlySummarySchema);

export default MonthlySummary;
