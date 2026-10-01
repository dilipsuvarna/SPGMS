const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const BREVO_SMTP_LOGIN = process.env.BREVO_SMTP_LOGIN;
const BREVO_SMTP_KEY = process.env.BREVO_SMTP_KEY;

let transporter = null;

function createTransporter() {
  if (transporter) return transporter;
  if (!EMAIL_USER || !BREVO_SMTP_LOGIN || !BREVO_SMTP_KEY) {
    throw new Error('EMAIL_USER, BREVO_SMTP_LOGIN, and BREVO_SMTP_KEY must be configured to send email');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: BREVO_SMTP_LOGIN,
      pass: BREVO_SMTP_KEY
    }
  });

  return transporter;
}

async function sendMail({ to, subject, text, html, from, attachments }) {
  try {
    const result = await createTransporter().sendMail({
      from: from || EMAIL_USER,
      to,
      subject,
      text,
      html,
      attachments
    });

    console.log('[notificationTransport] Brevo email sent', result && (result.messageId || result.accepted));
    return { ok: true, result };
  } catch (err) {
    console.error('[notificationTransport] Brevo sendMail error', err && err.message);
    return { ok: false, error: err && err.message };
  }
}

module.exports = { sendMail };
