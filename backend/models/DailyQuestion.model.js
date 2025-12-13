import mongoose from 'mongoose';

const dailyQuestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  questionText: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['Coding', 'Logic', 'Communication', 'Interview', 'Personal Growth'],
    index: true
  },
  source: {
    type: String,
    enum: ['curated', 'ai', 'template'],
    default: 'curated'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  scheduledDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  metadata: {
    templateId: String,
    tags: [String],
    personalizationScore: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
dailyQuestionSchema.index({ userId: 1, scheduledDate: 1 }, { unique: true });
dailyQuestionSchema.index({ category: 1, source: 1 });

const DailyQuestion = mongoose.model('DailyQuestion', dailyQuestionSchema);

export default DailyQuestion;
