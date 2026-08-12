const transport = require('./notificationTransport');
const templates = require('./emailTemplates');
const NotificationLog = require('../models/NotificationLog'); // optional - may exist

async function safeLogNotification(payload) {
  try {
    if (NotificationLog) {
      await NotificationLog.create({
        to: payload.to,
        subject: payload.subject,
        template: payload.templateName,
        success: payload.ok,
        error: payload.error || null,
        meta: payload.meta || {}
      });
    }
  } catch (err) {
    console.error('[notificationService] failed to persist NotificationLog', err && err.message);
  }
}

async function sendComplaintRegisteredEmail(complaint, toEmail) {
  const subject = `SPGMS: Complaint Registered ${complaint.complaintId || ''}`;
  const html = templates.registeredTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    const out = { ok: res.ok, result: res.result };
    await safeLogNotification({ to: toEmail, subject, templateName: 'registered', ok: res.ok, error: res.ok ? null : res.error });
    return out;
  } catch (err) {
    console.error('[notificationService] sendComplaintRegisteredEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'registered', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

async function sendComplaintAssignedEmail(complaint, toEmail) {
  const subject = `SPGMS: Complaint Assigned ${complaint.complaintId || ''}`;
  const html = templates.assignedTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    await safeLogNotification({ to: toEmail, subject, templateName: 'assigned', ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error('[notificationService] sendComplaintAssignedEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'assigned', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

async function sendWorkStartedEmail(complaint, toEmail) {
  const subject = `SPGMS: Work Started on ${complaint.complaintId || ''}`;
  const html = templates.workStartedTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    await safeLogNotification({ to: toEmail, subject, templateName: 'work_started', ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error('[notificationService] sendWorkStartedEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'work_started', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

async function sendUnderProgressEmail(complaint, toEmail) {
  const subject = `SPGMS: Work In Progress - ${complaint.complaintId || ''}`;
  const html = templates.underProgressTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    await safeLogNotification({ to: toEmail, subject, templateName: 'under_progress', ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error('[notificationService] sendUnderProgressEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'under_progress', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

async function sendResolvedEmail(complaint, toEmail) {
  const subject = `SPGMS: Complaint Resolved ${complaint.complaintId || ''}`;
  const html = templates.resolvedTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    await safeLogNotification({ to: toEmail, subject, templateName: 'resolved', ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error('[notificationService] sendResolvedEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'resolved', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

async function sendClosedEmail(complaint, toEmail) {
  const subject = `SPGMS: Complaint Closed ${complaint.complaintId || ''}`;
  const html = templates.closedTemplate(complaint);
  try {
    const res = await transport.sendMail({ to: toEmail, subject, html });
    await safeLogNotification({ to: toEmail, subject, templateName: 'closed', ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error('[notificationService] sendClosedEmail error', err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName: 'closed', ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}

module.exports = {
  sendComplaintRegisteredEmail,
  sendComplaintAssignedEmail,
  sendWorkStartedEmail,
  sendUnderProgressEmail,
  sendResolvedEmail,
  sendClosedEmail
};
