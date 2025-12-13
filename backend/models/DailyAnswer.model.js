import mongoose from 'mongoose';

const dailyAnswerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyQuestion',
    required: true
  },
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEntry',
    default: null
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  sanitizedText: {
    type: String
  },
  length: {
    type: Number
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  metadata: {
    tokens: [String],
    sentiment: Number,
    embeddingId: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
dailyAnswerSchema.index({ userId: 1, createdAt: -1 });
dailyAnswerSchema.index({ questionId: 1 });

// Pre-save middleware to compute length
dailyAnswerSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.length = this.text.length;
    this.sanitizedText = this.text.trim();
  }
  next();
});

const DailyAnswer = mongoose.model('DailyAnswer', dailyAnswerSchema);

export default DailyAnswer;
