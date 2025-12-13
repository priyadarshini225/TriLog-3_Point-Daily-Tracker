import RevisionSchedule from '../models/RevisionSchedule.model.js';

/**
 * Schedule 1-3-7 day revisions for entry items
 * @param {Object} entry - Daily entry document
 * @param {Array} items - Optional specific items to schedule (defaults to all reviseLater)
 * @returns {Array} Array of created schedule IDs
 */
export const scheduleRevisions = async (entry, items = null) => {
  const reviseItems = items || entry.reviseLater;
  
  if (!reviseItems || reviseItems.length === 0) {
    return [];
  }

  const scheduleIds = [];
  const entryDate = new Date(entry.date + 'T00:00:00Z');
  
  // Revision intervals in days
  const intervals = [1, 3, 7];

  for (const item of reviseItems) {
    for (const interval of intervals) {
      try {
        const scheduledAt = new Date(entryDate);
        scheduledAt.setDate(scheduledAt.getDate() + interval);
        
        // Set to noon UTC to avoid timezone issues
        scheduledAt.setUTCHours(12, 0, 0, 0);

        const idempotencyKey = `${entry._id}_${item.id}_${interval}`;

        // Check if schedule already exists
        const existing = await RevisionSchedule.findOne({ idempotencyKey });
        if (existing) {
          scheduleIds.push(existing._id);
          continue;
        }

        const schedule = await RevisionSchedule.create({
          userId: entry.userId,
          entryId: entry._id,
          revisionItemId: item.id,
          originalText: item.text,
          revisionType: interval,
          scheduledAt,
          status: 'pending',
          idempotencyKey
        });

        scheduleIds.push(schedule._id);
      } catch (error) {
        console.error(`Failed to schedule revision for item ${item.id}, interval ${interval}:`, error);
        // Continue with other schedules even if one fails
      }
    }
  }

  return scheduleIds;
};

/**
 * Get due revisions for a user
 * @param {String} userId - User ID
 * @param {Date} beforeDate - Get revisions due before this date
 * @returns {Array} Array of revision schedules
 */
export const getDueRevisions = async (userId, beforeDate = new Date()) => {
  return await RevisionSchedule.find({
    userId,
    status: 'pending',
    scheduledAt: { $lte: beforeDate }
  })
    .sort({ scheduledAt: 1 })
    .populate('entryId', 'date completed learned');
};

/**
 * Mark revision as missed and optionally reschedule
 * @param {String} scheduleId - Schedule ID
 * @param {Boolean} reschedule - Whether to reschedule
 * @returns {Object} Updated schedule
 */
export const markRevisionMissed = async (scheduleId, reschedule = false) => {
  const schedule = await RevisionSchedule.findById(scheduleId);
  
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  schedule.status = 'missed';
  schedule.attempts += 1;
  await schedule.save();

  if (reschedule && schedule.attempts < 3) {
    // Reschedule for next day
    const newScheduledAt = new Date();
    newScheduledAt.setDate(newScheduledAt.getDate() + 1);
    newScheduledAt.setUTCHours(12, 0, 0, 0);

    const newSchedule = await RevisionSchedule.create({
      userId: schedule.userId,
      entryId: schedule.entryId,
      revisionItemId: schedule.revisionItemId,
      originalText: schedule.originalText,
      revisionType: schedule.revisionType,
      scheduledAt: newScheduledAt,
      status: 'pending',
      attempts: schedule.attempts,
      priorityScore: schedule.priorityScore * 1.2 // Increase priority
    });

    return newSchedule;
  }

  return schedule;
};
