import mongoose from 'mongoose';

const questionTemplateSchema = new mongoose.Schema({
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
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
questionTemplateSchema.index({ category: 1, isActive: 1 });
questionTemplateSchema.index({ tags: 1 });

const QuestionTemplate = mongoose.model('QuestionTemplate', questionTemplateSchema);

export default QuestionTemplate;
