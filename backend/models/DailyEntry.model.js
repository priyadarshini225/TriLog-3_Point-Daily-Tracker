import mongoose from 'mongoose';

const reviseItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const dailyEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true,
    index: true
  },
  completed: {
    type: String,
    required: [true, 'Completed field is required'],
    maxlength: 500,
    trim: true
  },
  learned: {
    type: String,
    required: [true, 'Learned field is required'],
    maxlength: 500,
    trim: true
  },
  reviseLater: {
    type: [reviseItemSchema],
    default: []
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyQuestion',
    default: null
  },
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyAnswer',
    default: null
  },
  meta: {
    deviceInfo: String,
    offlineSync: { type: Boolean, default: false },
    editHistory: [{
      editedAt: Date,
      field: String
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
dailyEntrySchema.index({ userId: 1, date: 1 }, { unique: true });
dailyEntrySchema.index({ userId: 1, createdAt: -1 });
dailyEntrySchema.index({ tags: 1 });

const DailyEntry = mongoose.model('DailyEntry', dailyEntrySchema);

export default DailyEntry;
