import cron from 'node-cron';
import User from '../models/User.model.js';
import WeeklySummary from '../models/WeeklySummary.model.js';
import { getEmailConfigStatus, sendWeeklySummaryEmailNotification } from '../services/notification.service.js';
import { getAiConfigStatus } from '../services/ai.service.js';
import { generateWeeklySummaryForUser, markWeeklySummaryEmailed } from '../services/weeklySummary.service.js';

const boolFromEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

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

  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const toYmdUtc = (d) => new Date(d).toISOString().slice(0, 10);

export const startWeeklySummaryScheduler = () => {
  const enabled = boolFromEnv(process.env.WEEKLY_SUMMARY_ENABLED, true);
  if (!enabled) {
    console.log('ℹ️  Weekly summary scheduler disabled (WEEKLY_SUMMARY_ENABLED=false)');
    return null;
  }

  const cronExpr = process.env.WEEKLY_SUMMARY_CRON || '0 9 * * 0'; // Sunday 09:00 UTC by default
  const requireAi = boolFromEnv(process.env.WEEKLY_SUMMARY_REQUIRE_AI, true);
  const batchSize = Number(process.env.WEEKLY_SUMMARY_BATCH_SIZE || 50);

  const emailStatus = getEmailConfigStatus();
  if (!emailStatus.enabled) {
    console.log('ℹ️  Weekly summary emails disabled (EMAIL_ENABLED=false)');
  } else if (!emailStatus.ok) {
    console.log(`⚠️  Weekly summary emails enabled but SMTP config incomplete (${(emailStatus.missing || []).join(', ')})`);
  }

  const task = cron.schedule(cronExpr, async () => {
    const now = new Date();

    // Best-effort guard: only run on Sunday UTC if cron is misconfigured.
    if (now.getUTCDay() !== 0) return;

    const aiStatus = getAiConfigStatus();
    if (requireAi && !aiStatus.ok) {
      console.log('⚠️  Weekly summary requires AI but AI is not configured; skipping this run.');
      return;
    }

    try {
      const users = await User.find({ status: 'active', 'preferences.notificationChannels.email': true })
        .select({ _id: 1, email: 1, name: 1, timezone: 1, preferences: 1 })
        .limit(batchSize)
        .lean();

      if (!users.length) return;

      const weekEnd = toYmdUtc(now);

      for (const user of users) {
        try {
          const inDnd = isWithinDnd({ now, dndWindow: user?.preferences?.dndWindow, timeZone: user?.timezone || 'UTC' });
          if (inDnd) continue;

          // Pre-check to avoid duplicate sends.
          const existing = await WeeklySummary.findOne({ userId: user._id, weekEndDate: weekEnd }).select({ weekStartDate: 1, emailedAt: 1 }).lean();
          if (existing?.emailedAt) continue;

          const mode = requireAi ? 'ai' : '';
          const summaryResult = await generateWeeklySummaryForUser({ userId: user._id, end: weekEnd, upsert: true, mode });

          if (emailStatus.enabled && emailStatus.ok) {
            const sendResult = await sendWeeklySummaryEmailNotification({
              user,
              summary: summaryResult,
              revisionPlan: summaryResult?.revisionPlan,
            });
            if (!sendResult?.skipped) {
              await markWeeklySummaryEmailed({ userId: user._id, weekStartDate: summaryResult.weekStartDate });
            }
          }
        } catch (innerError) {
          console.error('WeeklySummaryScheduler: Failed processing user:', user?._id, innerError);
        }
      }
    } catch (error) {
      console.error('WeeklySummaryScheduler: Tick failed:', error);
    }
  });

  console.log(`✅ Weekly summary scheduler started (cron: ${cronExpr})`);
  return task;
};
