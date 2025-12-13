import nodemailer from 'nodemailer';

let cachedTransporter = null;

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const boolFromEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

export const getEmailConfigStatus = () => {
  const enabled = boolFromEnv(process.env.EMAIL_ENABLED, false);
  if (!enabled) {
    return { enabled: false, ok: false, reason: 'EMAIL_DISABLED' };
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const portRaw = String(process.env.SMTP_PORT || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  const missing = [];
  if (!host) missing.push('SMTP_HOST');
  if (!portRaw || !Number.isFinite(Number(portRaw))) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');

  if (missing.length > 0) {
    return { enabled: true, ok: false, reason: 'SMTP_INCOMPLETE', missing };
  }

  return { enabled: true, ok: true };
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const emailEnabled = boolFromEnv(process.env.EMAIL_ENABLED, false);
  if (!emailEnabled) {
    return null;
  }

  const status = getEmailConfigStatus();
  if (!status.ok) {
    // Keep runtime safe: caller can treat as skipped.
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = boolFromEnv(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
  });

  return cachedTransporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    const status = getEmailConfigStatus();
    return { skipped: true, reason: status.reason || 'EMAIL_DISABLED', ...(status.missing ? { missing: status.missing } : {}) };
  }

  const from = process.env.SMTP_FROM || 'TriLog <no-reply@trilog.local>';
  const sendTimeoutMs = Number(process.env.SMTP_SEND_TIMEOUT_MS || 20000);
  const result = await withTimeout(
    transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    }),
    sendTimeoutMs,
    `SMTP send timed out after ${sendTimeoutMs}ms`
  );

  return { skipped: false, messageId: result.messageId };
};

const buildRevisionEmail = ({ userName, revision, frontendBaseUrl }) => {
  const snippet = String(revision.originalText || '').slice(0, 140);
  const revisionType = revision.revisionType;
  const scheduledDate = revision.scheduledAt ? new Date(revision.scheduledAt).toISOString().slice(0, 10) : '';

  const link = `${frontendBaseUrl.replace(/\/$/, '')}/revisions`;

  const subject = `TriLog Revision Due (Day ${revisionType})`;
  const text = [
    `Hi ${userName || 'there'},`,
    '',
    `You have a TriLog revision due (Day ${revisionType}).`,
    `Scheduled: ${scheduledDate}`,
    '',
    `Prompt: ${snippet}${snippet.length === 140 ? '…' : ''}`,
    '',
    `Open TriLog to complete it: ${link}`,
    '',
    '— TriLog',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hi ${userName || 'there'},</p>
      <p><strong>You have a TriLog revision due (Day ${revisionType}).</strong></p>
      <p>Scheduled: ${scheduledDate}</p>
      <p style="margin-top: 12px;">Prompt:</p>
      <blockquote style="border-left: 4px solid #e5e7eb; margin: 8px 0; padding: 8px 12px; color: #111827;">
        ${escapeHtml(snippet)}${snippet.length === 140 ? '&hellip;' : ''}
      </blockquote>
      <p>
        <a href="${link}" style="display: inline-block; padding: 10px 14px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px;">
          Open TriLog
        </a>
      </p>
      <p style="color:#6b7280; font-size: 12px;">— TriLog</p>
    </div>
  `;

  return { subject, text, html };
};

const escapeHtml = (unsafe) => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sendRevisionEmailNotification = async ({ user, revision }) => {
  const frontendBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { subject, text, html } = buildRevisionEmail({
    userName: user?.name,
    revision,
    frontendBaseUrl,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};

const buildWeeklySummaryEmail = ({ userName, summary, revisionPlan, frontendBaseUrl }) => {
  const start = summary?.weekStartDate || summary?.period?.startDate || '';
  const end = summary?.weekEndDate || summary?.period?.endDate || '';
  const title = start && end ? `${start} → ${end}` : 'Last 7 days';

  const link = `${frontendBaseUrl.replace(/\/$/, '')}/summaries`;

  const narrative = String(summary?.narrative || '').trim();
  const keyLearnings = Array.isArray(summary?.keyLearnings) ? summary.keyLearnings.slice(0, 6) : [];
  const plan = Array.isArray(revisionPlan) ? revisionPlan.slice(0, 7) : [];

  const subject = `TriLog Weekly Review (${title})`;
  const text = [
    `Hi ${userName || 'there'},`,
    '',
    `Here is your TriLog weekly review (${title}).`,
    '',
    narrative ? `Summary: ${narrative}` : '',
    '',
    keyLearnings.length ? 'Key learnings:' : '',
    ...keyLearnings.map((k) => `- ${k}`),
    '',
    plan.length ? '7-day revision plan:' : '',
    ...plan.map((p, idx) => `${idx + 1}. ${p}`),
    '',
    `Open TriLog: ${link}`,
    '',
    '— TriLog',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p><strong>Here is your TriLog weekly review (${escapeHtml(title)}).</strong></p>
      ${narrative ? `<p>${escapeHtml(narrative)}</p>` : ''}

      ${
        keyLearnings.length
          ? `
        <p style="margin-top: 12px;"><strong>Key learnings</strong></p>
        <ul>
          ${keyLearnings.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}
        </ul>
      `
          : ''
      }

      ${
        plan.length
          ? `
        <p style="margin-top: 12px;"><strong>7-day revision plan</strong></p>
        <ol>
          ${plan.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}
        </ol>
      `
          : ''
      }

      <p style="margin-top: 14px;">
        <a href="${link}" style="display: inline-block; padding: 10px 14px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px;">
          Open TriLog
        </a>
      </p>
      <p style="color:#6b7280; font-size: 12px;">— TriLog</p>
    </div>
  `;

  return { subject, text, html };
};

export const sendWeeklySummaryEmailNotification = async ({ user, summary, revisionPlan }) => {
  const frontendBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { subject, text, html } = buildWeeklySummaryEmail({
    userName: user?.name,
    summary,
    revisionPlan,
    frontendBaseUrl,
  });

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
};
