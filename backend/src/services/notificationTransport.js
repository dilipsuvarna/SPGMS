const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter = null;

function createTransporter() {
  if (transporter) return transporter;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[notificationTransport] EMAIL_USER or EMAIL_PASS not configured; transport will be a no-op logger.');
    transporter = {
      async sendMail(opts) {
        console.log('[notificationTransport] (dev) sendMail called with', opts);
        return { accepted: [opts.to], messageId: 'dev-local' };
      }
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  // Verify transporter in background
  transporter.verify().then(() => {
    console.log('[notificationTransport] Nodemailer transporter verified');
  }).catch((err) => {
    console.error('[notificationTransport] transporter verify failed', err && err.message);
  });

  return transporter;
}

async function sendMail({ to, subject, text, html, from }) {
  try {
    const t = createTransporter();
    const mailOptions = {
      from: from || process.env.EMAIL_USER || 'no-reply@spgms.local',
      to,
      subject,
      text,
      html
    };

    const res = await t.sendMail(mailOptions);
    console.log('[notificationTransport] mail sent result', res && (res.messageId || res.accepted));
    return { ok: true, result: res };
  } catch (err) {
    console.error('[notificationTransport] sendMail error', err && err.message);
    return { ok: false, error: err && err.message };
  }
}

module.exports = { sendMail };
