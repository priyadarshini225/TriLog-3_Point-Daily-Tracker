import mongoose from 'mongoose';

const revisionScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEntry',
    required: true
  },
  revisionItemId: {
    type: String, // ID from the reviseLater array
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  revisionType: {
    type: Number,
    enum: [1, 3, 7],
    required: true
  },
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'notified', 'completed', 'missed', 'ignored'],
    default: 'pending',
    index: true
  },
  notifiedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  responseText: {
    type: String,
    maxlength: 1000
  },
  confidence: {
    type: Number,
    min: 0,
    max: 5
  },
  attempts: {
    type: Number,
    default: 0
  },
  priorityScore: {
    type: Number,
    default: 1.0
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
revisionScheduleSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
revisionScheduleSchema.index({ entryId: 1, revisionItemId: 1, revisionType: 1 }, { unique: true });

const RevisionSchedule = mongoose.model('RevisionSchedule', revisionScheduleSchema);

export default RevisionSchedule;
