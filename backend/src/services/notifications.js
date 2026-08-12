const https = require('https');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@spgms.local';

async function sendEmail(to, subject, text, html) {
  if (!SENDGRID_API_KEY) {
    console.log('[notifications] SENDGRID_API_KEY not configured. Email would be:', { to, subject, text });
    return { ok: false, reason: 'no-sendgrid' };
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: SENDER_EMAIL },
    subject: subject,
    content: [{ type: 'text/plain', value: text }]
  };

  if (html) {
    payload.content = [{ type: 'text/html', value: html }];
  }

  const data = JSON.stringify(payload);

  const options = {
    hostname: 'api.sendgrid.com',
    port: 443,
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[notifications] Email sent to', to, 'subject:', subject);
          resolve({ ok: true });
        } else {
          console.error('[notifications] SendGrid response', res.statusCode, body);
          resolve({ ok: false, reason: `status_${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[notifications] request error', err);
      resolve({ ok: false, reason: err.message });
    });

    req.write(data);
    req.end();
  });
}

module.exports = { sendEmail };
