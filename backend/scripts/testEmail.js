import dotenv from 'dotenv';

dotenv.config();

import { getEmailConfigStatus, sendEmail } from '../services/notification.service.js';

const recipient = process.argv[2] || process.env.TEST_EMAIL_TO;

if (!recipient) {
  console.error('Missing recipient email. Usage: npm run test-email -- you@example.com');
  console.error('Or set TEST_EMAIL_TO in backend/.env');
  process.exit(2);
}

const status = getEmailConfigStatus();
if (!status.enabled) {
  console.error('Email is disabled (set EMAIL_ENABLED=true in backend/.env)');
  process.exit(2);
}
if (!status.ok) {
  console.error(`Email is enabled but SMTP config incomplete: ${(status.missing || []).join(', ')}`);
  process.exit(2);
}

try {
  const result = await sendEmail({
    to: recipient,
    subject: 'TriLog SMTP test',
    text: 'If you received this email, TriLog SMTP is configured correctly.',
    html: '<p>If you received this email, <strong>TriLog SMTP</strong> is configured correctly.</p>',
  });

  if (result?.skipped) {
    console.error(`Email send skipped: ${result.reason || 'UNKNOWN'}`);
    if (result.missing?.length) console.error(`Missing: ${result.missing.join(', ')}`);
    process.exit(3);
  }

  console.log(`✅ Test email sent to ${recipient}`);
  if (result?.messageId) console.log(`messageId: ${result.messageId}`);
} catch (error) {
  console.error('❌ Failed to send test email:', error);
  process.exit(1);
}
