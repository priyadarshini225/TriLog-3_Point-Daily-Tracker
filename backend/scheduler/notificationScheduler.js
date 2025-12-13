import cron from 'node-cron';
import RevisionSchedule from '../models/RevisionSchedule.model.js';
import User from '../models/User.model.js';
import { getEmailConfigStatus, sendRevisionEmailNotification } from '../services/notification.service.js';

const parseHHMM = (value, fallback) => {
  const input = (value || fallback || '').trim();
  const match = input.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const getLocalTimeParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);
  return { hour, minute };
};

const isWithinDnd = ({ now, dndWindow, timeZone }) => {
  if (!dndWindow?.enabled) return false;

  const start = parseHHMM(dndWindow.start, process.env.DND_DEFAULT_START || '22:00');
  const end = parseHHMM(dndWindow.end, process.env.DND_DEFAULT_END || '08:00');
  if (!start || !end) return false;

  const { hour, minute } = getLocalTimeParts(now, timeZone);
  const currentMinutes = hour * 60 + minute;
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  // If start == end, treat as no DND (or always DND). We'll choose no DND.
  if (startMinutes === endMinutes) return false;

  // Handles wrap-around windows (e.g., 22:00 -> 08:00)
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const getMaxEmailsPerDay = () => {
  const parsed = Number(process.env.MAX_EMAILS_PER_DAY || 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
};

const countEmailsSentTodayUtc = async (userId) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return await RevisionSchedule.countDocuments({
    userId,
    notifiedAt: { $gte: start, $lt: end },
  });
};

export const startNotificationScheduler = () => {
  const status = getEmailConfigStatus();
  if (!status.enabled) {
    console.log('ℹ️  Email notifications disabled (EMAIL_ENABLED=false)');
    return null;
  }
  if (!status.ok) {
    console.log(`⚠️  Email notifications enabled but SMTP config incomplete (${(status.missing || []).join(', ')})`);
    console.log('ℹ️  Set SMTP vars in backend/.env or set EMAIL_ENABLED=false');
    return null;
  }

  const batchSize = Number(process.env.NOTIFICATION_BATCH_SIZE || 50);

  // Every 5 minutes. Keeps it simple and reliable.
  const task = cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    try {
      const due = await RevisionSchedule.find({
        status: 'pending',
        scheduledAt: { $lte: now },
      })
        .sort({ scheduledAt: 1 })
        .limit(batchSize)
        .lean();

      if (due.length === 0) return;

      for (const revision of due) {
        try {
          const user = await User.findById(revision.userId).lean();
          if (!user || user.status !== 'active') continue;

          const emailOptIn = user?.preferences?.notificationChannels?.email === true;
          if (!emailOptIn) continue;

          const inDnd = isWithinDnd({
            now,
            dndWindow: user?.preferences?.dndWindow,
            timeZone: user?.timezone || 'UTC',
          });
          if (inDnd) continue;

          const maxPerDay = getMaxEmailsPerDay();
          const sentToday = await countEmailsSentTodayUtc(user._id);
          if (sentToday >= maxPerDay) continue;

          const sendResult = await sendRevisionEmailNotification({ user, revision });
          if (sendResult?.skipped) continue;

          await RevisionSchedule.updateOne(
            { _id: revision._id, status: 'pending' },
            { $set: { status: 'notified', notifiedAt: new Date() } }
          );
        } catch (innerError) {
          console.error('NotificationScheduler: Failed processing revision:', revision?._id, innerError);
        }
      }
    } catch (error) {
      console.error('NotificationScheduler: Tick failed:', error);
    }
  });

  console.log('✅ Notification scheduler started (email)');
  return task;
};
