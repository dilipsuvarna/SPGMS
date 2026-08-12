const POLL_INTERVAL_MS = parseInt(process.env.AGENT_POLL_MS || '60000', 10); // default: 60s
const notificationService = require('./notificationService');

const Officer = require('../models/Officer');
const Complaint = require('../models/Complaint');
const NotificationLog = require('../models/NotificationLog');

let timer = null;

async function pickOfficerForDepartment(department) {
  // pick officer with fewest assigned open complaints
  const officers = await Officer.find({ department }).exec();
  if (!officers || officers.length === 0) return null;

  let best = null;
  let bestCount = Number.MAX_SAFE_INTEGER;
  for (const o of officers) {
    const cnt = await Complaint.countDocuments({ assigned_officer_id: o._id, status: { $ne: 'Closed' } });
    if (cnt < bestCount) {
      bestCount = cnt;
      best = o;
    }
  }
  return best;
}

async function assignPendingComplaints() {
  // find complaints that are Registered and not assigned
  const rows = await Complaint.find({ status: 'Registered', $or: [{ assigned_officer_id: null }, { assigned_officer_id: { $exists: false } }] }).exec();
  if (!rows || rows.length === 0) return;

  for (const c of rows) {
    const officer = await pickOfficerForDepartment(c.department);
    if (!officer) continue;

    c.assigned_officer_id = officer._id;
    c.assignedOfficerName = officer.name || (officer.department + ' Officer');
    c.status = 'Assigned';
    c.updated_at = new Date();
    await c.save();

    // notify the citizen via email
    if (c.email) {
      try {
        await notificationService.sendComplaintAssignedEmail(c, c.email);
      } catch (err) {
        console.error('[agentic] notification error', err && err.message);
      }
    }

    await NotificationLog.create({ complaint: c._id, to_email: c.email || null, event: 'assigned' });
  }
}

function startAgent() {
  if (timer) return;
  timer = setInterval(() => {
    assignPendingComplaints().catch(err => console.error('[agentic] error', err));
  }, POLL_INTERVAL_MS);
  console.log('[agentic] started agentic assignment, interval ms =', POLL_INTERVAL_MS);
}

function stopAgent() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startAgent, stopAgent };
