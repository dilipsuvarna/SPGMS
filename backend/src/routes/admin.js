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
    return res.json({ complaints: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/officers', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const rows = await Officer.find().sort({ name: 1 }).lean().exec();
    return res.json({ officers: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Override department / priority / status / assigned officer
router.put('/complaints/:complaint_id/override', verifyToken, requireRole('admin'), express.json(), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { department, priority, status, assigned_officer_id, ai_department, ai_priority, officer_remarks } = req.body;

    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    if (department) c.department = department;
    if (priority) c.priority = priority;
    if (status) c.status = status;
    if (assigned_officer_id) c.assigned_officer_id = assigned_officer_id;
    if (ai_department) c.ai_department = ai_department;
    if (ai_priority) c.ai_priority = ai_priority;
    if (officer_remarks) c.officer_remarks = officer_remarks;
    c.updated_at = new Date();
    await c.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
