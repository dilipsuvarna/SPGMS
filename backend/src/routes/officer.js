const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireRole, generateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const ComplaintDeleteRequest = require('../models/ComplaintDeleteRequest');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) { const unique = Date.now() + '-' + Math.round(Math.random() * 1e9); cb(null, unique + path.extname(file.originalname)); }
});
function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true); else cb(new Error('Invalid file type. Only JPG, JPEG and PNG are allowed.'), false);
}
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 5 }, fileFilter });

// Officer login (email + password) -> returns JWT
router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'missing_credentials' });

    const Officer = require('../models/Officer');
    const officer = await Officer.findOne({ email }).exec();
    if (!officer) return res.status(401).json({ error: 'invalid_credentials' });

    const valid = bcrypt.compareSync(password, officer.password_hash || '');
    if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

    const token = generateToken({ id: officer._id.toString(), role: 'officer', department: officer.department, email: officer.email });

    return res.json({ token, officer: { id: officer._id, name: officer.name, department: officer.department, email: officer.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// List assigned complaints for an officer id (query param or body)
router.get('/assigned/:officer_id', verifyToken, async (req, res) => {
  try {
    const { officer_id } = req.params;
    // ensure officer can only fetch their own assigned list unless admin
    if (req.user.role === 'officer' && req.user.id != officer_id) return res.status(403).json({ error: 'forbidden' });

    const Complaint = require('../models/Complaint');
    const rows = await Complaint.find({ assigned_officer_id: officer_id }).sort({ created_at: -1 }).lean().exec();
    return res.json({ complaints: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/complaints/:complaint_id/delete-request', verifyToken, requireRole('officer'), express.json(), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'reason_required' });

    const Complaint = require('../models/Complaint');
    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (String(c.assigned_officer_id) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });

    const existing = await ComplaintDeleteRequest.findOne({ complaint: c._id, status: 'pending' }).exec();
    if (existing) return res.status(409).json({ error: 'request_already_pending' });

    const Officer = require('../models/Officer');
    const officer = await Officer.findById(req.user.id).lean().exec();
    const request = await ComplaintDeleteRequest.create({
      complaint: c._id,
      complaint_id: c.complaint_id,
      officer: req.user.id,
      officer_name: officer?.name || req.user.email || 'Officer',
      reason
    });
    return res.status(201).json({ ok: true, request: request.toObject() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Update complaint fields using the same JSON contract as the admin override.
router.put('/complaints/:complaint_id/override', verifyToken, requireRole('officer'), express.json(), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { department, priority, status, officer_remarks, remarks, expected_resolution_date, expectedCompletion } = req.body;
    const allowedStatuses = new Set([
      'Registered', 'Assigned', 'Work Started', 'Work In Progress',
      'Expected Completion', 'Resolved', 'Closed'
    ]);

    if (status !== undefined && !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'invalid_status' });
    }

    const Complaint = require('../models/Complaint');
    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (String(c.assigned_officer_id) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });

    if (department) c.department = department;
    if (priority) c.priority = priority;
    if (status) c.status = status;
    if (officer_remarks !== undefined || remarks !== undefined) c.officer_remarks = officer_remarks ?? remarks;
    if (expected_resolution_date !== undefined || expectedCompletion !== undefined) {
      c.expected_resolution_date = expected_resolution_date ?? expectedCompletion;
    }
    c.updated_at = new Date();
    c.timeline = c.timeline || [];
    c.timeline.push({
      status: c.status,
      timestamp: new Date(),
      remarks: c.officer_remarks || '',
      by: req.user.email || 'officer'
    });
    await c.save();

    if (c.email) await notificationService.sendComplaintUpdatedEmail(c);
    return res.json({ ok: true, complaint: c.toObject() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Update complaint status (start, progress, resolved, closed) and add remarks/expected completion
router.put('/complaint/:complaint_id/status', verifyToken, requireRole('officer'), upload.array('images', 5), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { status, remarks, expected_resolution_date, expectedCompletion, officer_remarks, department, priority } = req.body;
    const nextExpectedResolution = expected_resolution_date ?? expectedCompletion;
    const nextRemarks = remarks ?? officer_remarks;
    const files = req.files || [];
    const allowedStatuses = new Set([
      'Registered', 'Assigned', 'Work Started', 'Work In Progress',
      'Expected Completion', 'Resolved', 'Closed'
    ]);

    if (status !== undefined && !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'invalid_status' });
    }

    const Complaint = require('../models/Complaint');
    const ComplaintImage = require('../models/ComplaintImage');
    const NotificationLog = require('../models/NotificationLog');
    const cloudinaryService = require('../services/cloudinaryService');

    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    // The route is already restricted to authenticated officers. Allow the officer
    // portal to override the complaint fields just like the admin review form.
    if (req.user.role !== 'officer') return res.status(403).json({ error: 'forbidden' });

    if (department) c.department = department;
    if (priority) c.priority = priority;
    if (status !== undefined) c.status = status;
    if (nextExpectedResolution !== undefined) c.expected_resolution_date = nextExpectedResolution;
    if (nextRemarks !== undefined) c.officer_remarks = nextRemarks;
    c.updated_at = new Date();
    c.timeline = c.timeline || [];
    c.timeline.push({ status: c.status, timestamp: new Date(), remarks: nextRemarks || '', by: req.user.email || req.user.username || 'officer' });
    if (files.length > 0) {
      const urls = [];
      for (const f of files) {
        if (cloudinaryService.configured) {
          const uploaded = await cloudinaryService.uploadFile(f.path, { folder: 'spgms/completions' });
          if (!uploaded.ok) {
            return res.status(502).json({ error: 'completion_image_upload_failed', details: uploaded.error });
          }
          urls.push(uploaded.url);
          fs.unlink(f.path, () => {});
        } else {
          urls.push(`/uploads/${path.basename(f.path)}`);
        }
      }
      if (urls.length > 0) c.completion_images = (c.completion_images || []).concat(urls);
      for (const imagePath of urls) {
        await ComplaintImage.create({ complaint: c._id, path: imagePath, source: 'completion' });
      }
    }
    await c.save();

    try {
      if (c.email) {
        await notificationService.sendComplaintUpdatedEmail(c);
        await NotificationLog.create({ complaint: c._id, to_email: c.email || null, event: status });
      }
    } catch (err) {
      console.error('[officer] notification error', err && err.message);
    }

    return res.json({ ok: true, complaint: c.toObject() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
