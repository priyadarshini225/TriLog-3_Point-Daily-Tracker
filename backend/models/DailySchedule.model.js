import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String, // Format: "HH:mm" (e.g., "09:00")
    required: true
  },
  endTime: {
    type: String, // Format: "HH:mm" (e.g., "10:30")
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  color: {
    type: String,
    default: '#2F6D2F'
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const dailyScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  wakeTime: {
    type: String, // Format: "HH:mm" (e.g., "06:00")
    required: true
  },
  bedTime: {
    type: String, // Format: "HH:mm" (e.g., "22:00")
    required: true
  },
  tasks: [taskSchema],
  productiveHours: {
    type: Number,
    default: 0 // Total productive hours calculated from completed tasks
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create compound index for userId and date
dailyScheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate productive hours before saving
dailyScheduleSchema.pre('save', function(next) {
  if (this.tasks && this.tasks.length > 0) {
    const completedTasks = this.tasks.filter(task => task.completed);
    this.productiveHours = completedTasks.reduce((total, task) => total + (task.duration / 60), 0);
  }
  next();
});

// Method to calculate available hours
dailyScheduleSchema.methods.getAvailableHours = function() {
  const [wakeHour, wakeMin] = this.wakeTime.split(':').map(Number);
  const [bedHour, bedMin] = this.bedTime.split(':').map(Number);
  
  const wakeMinutes = wakeHour * 60 + wakeMin;
  const bedMinutes = bedHour * 60 + bedMin;
  
  return (bedMinutes - wakeMinutes) / 60;
};

// Method to get timeline hours array
dailyScheduleSchema.methods.getTimelineHours = function() {
  const [wakeHour] = this.wakeTime.split(':').map(Number);
  const [bedHour] = this.bedTime.split(':').map(Number);
  
  const hours = [];
  for (let hour = wakeHour; hour <= bedHour; hour++) {
    hours.push(hour);
  }
  return hours;
};

const DailySchedule = mongoose.model('DailySchedule', dailyScheduleSchema);

export default DailySchedule;
