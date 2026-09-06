const transport = require('./notificationTransport');
const templates = require('./emailTemplates');
const NotificationLog = require('../models/NotificationLog'); // optional - may exist
const ComplaintImage = require('../models/ComplaintImage');
const path = require('path');
const fs = require('fs');

function complaintId(complaint) {
  return complaint.complaint_id || complaint.complaintId || complaint._id || '';
}

async function getAttachments(complaint) {
  const records = await ComplaintImage.find({ complaint: complaint._id }).lean().exec();
  const images = [...(complaint.completion_images || []), ...records.map((record) => record.path)];
  return [...new Set(images)].map((image) => {
    if (/^https?:\/\//i.test(image)) return { href: image };
    const filePath = path.isAbsolute(image)
      ? image
      : path.join(__dirname, '..', '..', image.replace(/^[/\\]+/, ''));
    return fs.existsSync(filePath) ? { path: filePath } : null;
  }).filter(Boolean);
}

async function sendComplaintEmail(complaint, toEmail, subject, html, templateName) {
  try {
    const attachments = await getAttachments(complaint);
    const res = await transport.sendMail({ to: toEmail, subject, html, attachments });
    await safeLogNotification({ to: toEmail, subject, templateName, ok: res.ok, error: res.ok ? null : res.error });
    return { ok: res.ok };
  } catch (err) {
    console.error(`[notificationService] ${templateName} email error`, err && err.message);
    await safeLogNotification({ to: toEmail, subject, templateName, ok: false, error: err && err.message });
    return { ok: false, error: err && err.message };
  }
}


function notificationRecipients(complaint, primaryEmail) {
  return [...new Set([
    primaryEmail || complaint.email,
    ...(complaint.affected_contacts || []).map((contact) => contact.email)
  ].filter(Boolean).map((email) => email.trim().toLowerCase()))];
}

async function sendComplaintEmailToRecipients(complaint, subject, html, templateName, primaryEmail) {
  const recipients = notificationRecipients(complaint, primaryEmail);
  return Promise.all(recipients.map((email) => sendComplaintEmail(complaint, email, subject, html, templateName)));
}

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
  const subject = `SPGMS: Complaint Registered ${complaintId(complaint)}`;
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
  const subject = `SPGMS: Complaint Assigned ${complaintId(complaint)}`;
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
  const subject = `SPGMS: Work Started on ${complaintId(complaint)}`;
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
  const subject = `SPGMS: Work In Progress - ${complaintId(complaint)}`;
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
  const subject = `SPGMS: Complaint Resolved ${complaintId(complaint)}`;
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
  const subject = `SPGMS: Complaint Closed ${complaintId(complaint)}`;
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

async function sendComplaintUpdatedEmail(complaint, toEmail) {
  const results = await sendComplaintEmailToRecipients(
    complaint,
    `SPGMS: Complaint Updated ${complaintId(complaint)}`,
    templates.updatedTemplate(complaint),
    'updated',
    toEmail
  );
  return { ok: results.every((result) => result.ok), results };
}

async function sendComplaintTransferredEmail(complaint, previousComplaintId, previousDepartment, toEmail) {
  const results = await sendComplaintEmailToRecipients(
    complaint,
    `SPGMS: Complaint Transferred ${complaintId(complaint)}`,
    templates.transferredTemplate(complaint, previousComplaintId, previousDepartment),
    'transferred',
    toEmail
  );
  return { ok: results.every((result) => result.ok), results };
}

module.exports = {
  sendComplaintRegisteredEmail,
  sendComplaintAssignedEmail,
  sendWorkStartedEmail,
  sendUnderProgressEmail,
  sendResolvedEmail,
  sendClosedEmail,
  sendComplaintUpdatedEmail,
  sendComplaintTransferredEmail
};
