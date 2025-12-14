import DailySchedule from '../models/DailySchedule.model.js';

// @desc    Get schedule for a specific date
// @route   GET /api/schedules/:date
// @access  Private
const getScheduleByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    let schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (!schedule) {
      // Return empty schedule structure
      return res.status(200).json({
        success: true,
        data: {
          date: scheduleDate,
          wakeTime: '06:00',
          bedTime: '22:00',
          tasks: [],
          productiveHours: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update schedule
// @route   POST /api/schedules
// @access  Private
const createOrUpdateSchedule = async (req, res, next) => {
  try {
    const { date, wakeTime, bedTime, tasks, notes } = req.body;

    if (!date || !wakeTime || !bedTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date, wake time, and bed time'
      });
    }

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(wakeTime) || !timeRegex.test(bedTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:mm format'
      });
    }

    let schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (schedule) {
      // Update existing schedule
      schedule.wakeTime = wakeTime;
      schedule.bedTime = bedTime;
      schedule.tasks = tasks || schedule.tasks;
      schedule.notes = notes !== undefined ? notes : schedule.notes;
      await schedule.save();
    } else {
      // Create new schedule
      schedule = await DailySchedule.create({
        userId: req.user._id,
        date: scheduleDate,
        wakeTime,
        bedTime,
        tasks: tasks || [],
        notes
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add task to schedule
// @route   POST /api/schedules/:date/tasks
// @access  Private
const addTask = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { taskName, startTime, endTime, priority, color, notes } = req.body;

    if (!taskName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide task name, start time, and end time'
      });
    }

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    const schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found for this date'
      });
    }

    // Calculate duration in minutes
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const newTask = {
      taskName,
      startTime,
      endTime,
      duration,
      priority: priority || 'medium',
      color: color || '#2F6D2F',
      notes
    };

    schedule.tasks.push(newTask);
    await schedule.save();

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/schedules/:date/tasks/:taskId
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const { date, taskId } = req.params;
    const updates = req.body;

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    const schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const task = schedule.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Update task fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        task[key] = updates[key];
      }
    });

    // Recalculate duration if times changed
    if (updates.startTime || updates.endTime) {
      const [startHour, startMin] = task.startTime.split(':').map(Number);
      const [endHour, endMin] = task.endTime.split(':').map(Number);
      task.duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    await schedule.save();

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/schedules/:date/tasks/:taskId
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const { date, taskId } = req.params;

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    const schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.tasks.pull(taskId);
    await schedule.save();

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get schedules for date range (for calendar view)
// @route   GET /api/schedules?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
const getSchedulesByRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start date and end date'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const schedules = await DailySchedule.find({
      userId: req.user._id,
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task completion
// @route   PATCH /api/schedules/:date/tasks/:taskId/toggle
// @access  Private
const toggleTaskCompletion = async (req, res, next) => {
  try {
    const { date, taskId } = req.params;

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    const schedule = await DailySchedule.findOne({
      userId: req.user._id,
      date: scheduleDate
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const task = schedule.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.completed = !task.completed;
    await schedule.save();

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

export {
  getScheduleByDate,
  createOrUpdateSchedule,
  addTask,
  updateTask,
  deleteTask,
  getSchedulesByRange,
  toggleTaskCompletion
};
