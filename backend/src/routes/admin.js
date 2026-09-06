const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, generateToken } = require('../middleware/auth');

// Admin login - simple env-backed admin user
router.post('/login', express.json(), (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = generateToken({ username, role: 'admin' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'invalid_credentials' });
});

const Complaint = require('../models/Complaint');
const Officer = require('../models/Officer');
const ComplaintImage = require('../models/ComplaintImage');
const ComplaintDeleteRequest = require('../models/ComplaintDeleteRequest');
const DeletedComplaint = require('../models/DeletedComplaint');
const notificationService = require('../services/notificationService');
const { generateComplaintId } = require('../utils/complaintId');

async function pickOfficerForDepartment(department) {
  const officers = await Officer.find({ department }).sort({ name: 1 }).exec();
  if (officers.length === 0) return null;

  let selectedOfficer = officers[0];
  let selectedLoad = Number.MAX_SAFE_INTEGER;
  for (const officer of officers) {
    const load = await Complaint.countDocuments({
      assigned_officer_id: officer._id,
      status: { $ne: 'Closed' }
    });
    if (load < selectedLoad) {
      selectedOfficer = officer;
      selectedLoad = load;
    }
  }
  return selectedOfficer;
}

router.get('/dashboard', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const complaints = await Complaint.find().lean().exec();
    const officers = await Officer.find().lean().exec();
    const counts = { total: complaints.length, registered: 0, assigned: 0, workStarted: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const byDepartment = { Water: 0, Waste: 0, Electricity: 0, Road: 0 };
    for (const c of complaints) {
      if (c.status === 'Registered') counts.registered += 1;
      if (c.status === 'Assigned') counts.assigned += 1;
      if (c.status === 'Work Started') counts.workStarted += 1;
      if (c.status === 'Under Progress' || c.status === 'Work In Progress' || c.status === 'In Progress') counts.inProgress += 1;
      if (c.status === 'Resolved') counts.resolved += 1;
      if (c.status === 'Closed') counts.closed += 1;
      if (c.priority === 'Critical') counts.critical += 1;
      if (c.priority === 'High') counts.high += 1;
      if (c.priority === 'Medium') counts.medium += 1;
      if (c.priority === 'Low') counts.low += 1;
      if (c.department) byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
    }
    return res.json({ counts, byDepartment, officers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// List complaints with optional filters
router.get('/complaints', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const rows = await Complaint.find().sort({ created_at: -1 }).lean().exec();
    const complaints = await Promise.all(rows.map(async (complaint) => {
      const images = await ComplaintImage.find({ complaint: complaint._id }).lean().exec();
      const completionImageSet = new Set(complaint.completion_images || []);
      return {
        ...complaint,
        complaint_images: images
          .filter((image) => image.source !== 'completion' && !completionImageSet.has(image.path))
          .map((image) => image.path),
        completion_images: [...new Set([
          ...images.filter((image) => image.source === 'completion').map((image) => image.path),
          ...(complaint.completion_images || [])
        ])]
      };
    }));
    return res.json({ complaints });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/officers', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const rows = await Officer.find().sort({ name: 1 }).lean().exec();
    const requests = await ComplaintDeleteRequest.find({ status: 'pending' })
      .sort({ created_at: -1 })
      .lean()
      .exec();
    const requestsByOfficer = requests.reduce((grouped, request) => {
      const key = String(request.officer);
      grouped[key] = grouped[key] || [];
      grouped[key].push(request);
      return grouped;
    }, {});
    return res.json({
      officers: rows.map((officer) => ({
        ...officer,
        delete_requests: requestsByOfficer[String(officer._id)] || []
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.put('/delete-requests/:request_id/review', verifyToken, requireRole('admin'), express.json(), async (req, res) => {
  try {
    const { request_id } = req.params;
    const { action } = req.body || {};
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'invalid_action' });

    const request = await ComplaintDeleteRequest.findOne({ _id: request_id, status: 'pending' }).exec();
    if (!request) return res.status(404).json({ error: 'request_not_found' });

    if (action === 'accept') {
      const complaint = await Complaint.findById(request.complaint).exec();
      if (complaint) {
        await DeletedComplaint.updateOne(
          { complaint_id: complaint.complaint_id },
          { $setOnInsert: { complaint_id: complaint.complaint_id, deleted_by: req.user.username || req.user.email || 'admin' } },
          { upsert: true }
        ).exec();
        await ComplaintImage.deleteMany({ complaint: complaint._id }).exec();
        await ComplaintDeleteRequest.deleteMany({ complaint: complaint._id }).exec();
        await Complaint.deleteOne({ _id: complaint._id }).exec();
      }
      return res.json({ ok: true, status: 'approved', complaint_id: request.complaint_id });
    } else {
      request.status = 'rejected';
    }
    request.reviewed_at = new Date();
    request.reviewed_by = req.user.username || req.user.email || 'admin';
    await request.save();
    return res.json({ ok: true, status: request.status, complaint_id: request.complaint_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Permanently delete a complaint and its associated image records.
router.delete('/complaints/:complaint_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    await DeletedComplaint.updateOne(
      { complaint_id: c.complaint_id },
      { $setOnInsert: { complaint_id: c.complaint_id, deleted_by: req.user.username || req.user.email || 'admin' } },
      { upsert: true }
    ).exec();
    await ComplaintImage.deleteMany({ complaint: c._id }).exec();
    await ComplaintDeleteRequest.deleteMany({ complaint: c._id }).exec();
    await Complaint.deleteOne({ _id: c._id }).exec();
    return res.json({ ok: true, complaint_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Override department / priority / status / assigned officer
router.put('/complaints/:complaint_id/override', verifyToken, requireRole('admin'), express.json(), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { department, priority, status, assigned_officer_id, ai_department, ai_priority, officer_remarks, remarks, expected_resolution_date, expectedCompletion } = req.body;

    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    const previousDepartment = c.department;
    const previousComplaintId = c.complaint_id;
    const departmentChanged = Boolean(department && department !== previousDepartment);
    let transferredOfficer = null;
    if (departmentChanged) {
      transferredOfficer = await pickOfficerForDepartment(department);
      if (!transferredOfficer) {
        return res.status(409).json({ error: 'no_officer_for_department' });
      }
      c.department = department;
      c.complaint_id = await generateComplaintId(department);
      c.assigned_officer_id = transferredOfficer._id;
      c.assignedOfficerName = transferredOfficer.name || `${department} Officer`;
      c.transfer_history = c.transfer_history || [];
      c.transfer_history.push({
        previous_complaint_id: previousComplaintId,
        previous_department: previousDepartment,
        new_complaint_id: c.complaint_id,
        new_department: department,
        transferred_at: new Date(),
        transferred_by: req.user.username || req.user.email || 'admin',
        assigned_officer_id: transferredOfficer._id
      });
    } else if (department) {
      c.department = department;
    }
    const previousStatus = c.status;
    if (priority) c.priority = priority;
    if (status) c.status = status;
    if (assigned_officer_id && !departmentChanged) c.assigned_officer_id = assigned_officer_id;
    if (ai_department) c.ai_department = ai_department;
    if (ai_priority) c.ai_priority = ai_priority;
    if (officer_remarks !== undefined || remarks !== undefined) c.officer_remarks = officer_remarks ?? remarks;
    if (expected_resolution_date !== undefined || expectedCompletion !== undefined) c.expected_resolution_date = expected_resolution_date ?? expectedCompletion;
    c.updated_at = new Date();
    if (departmentChanged || (status && status !== previousStatus)) {
      c.timeline = c.timeline || [];
      c.timeline.push({
        status: departmentChanged ? 'Transferred' : c.status,
        timestamp: new Date(),
        remarks: departmentChanged
          ? `Transferred from ${previousDepartment} (${previousComplaintId}) to ${c.department} (${c.complaint_id}).`
          : c.officer_remarks || '',
        by: req.user.username || req.user.email || 'admin'
      });
    }
    await c.save();
    if (c.email) {
      if (departmentChanged) {
        await notificationService.sendComplaintTransferredEmail(c, previousComplaintId, previousDepartment);
      } else {
        await notificationService.sendComplaintUpdatedEmail(c);
      }
    }

    return res.json({
      ok: true,
      transferred: departmentChanged,
      previous_complaint_id: departmentChanged ? previousComplaintId : undefined,
      new_complaint_id: departmentChanged ? c.complaint_id : undefined,
      complaint: c.toObject()
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
