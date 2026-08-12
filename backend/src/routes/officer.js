const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, generateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

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


// Update complaint status (start, progress, resolved, closed) and add remarks/expected completion
router.put('/complaint/:complaint_id/status', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { status, remarks, expected_resolution_date } = req.body;
    const files = req.files || [];

    const Complaint = require('../models/Complaint');
    const NotificationLog = require('../models/NotificationLog');
    const cloudinaryService = require('../services/cloudinaryService');

    const c = await Complaint.findOne({ complaint_id }).exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    if (req.user.role === 'officer' && req.user.id != String(c.assigned_officer_id)) return res.status(403).json({ error: 'forbidden' });

    c.status = status || c.status;
    c.expected_resolution_date = expected_resolution_date || c.expected_resolution_date;
    c.officer_remarks = remarks || c.officer_remarks;
    c.updated_at = new Date();
    c.timeline = c.timeline || [];
    c.timeline.push({ status: c.status, timestamp: new Date(), remarks: remarks || '', by: req.user.email || req.user.username || 'officer' });
    if (files.length > 0 && c.status === 'Resolved') {
      const urls = [];
      for (const f of files) {
        if (cloudinaryService.configured) {
          const uploaded = await cloudinaryService.uploadFile(f.path);
          if (uploaded.ok) urls.push(uploaded.url);
        }
      }
      if (urls.length > 0) c.completion_images = (c.completion_images || []).concat(urls);
    }
    await c.save();

    try {
      if (c.email) {
        if (status === 'Work Started' || status === 'Started') {
          await notificationService.sendWorkStartedEmail(c, c.email);
        } else if (status === 'Under Progress' || status === 'In Progress' || status === 'Work In Progress') {
          await notificationService.sendUnderProgressEmail(c, c.email);
        } else if (status === 'Expected Completion' && expected_resolution_date) {
          await notificationService.sendUnderProgressEmail(c, c.email);
        } else if (status === 'Resolved') {
          await notificationService.sendResolvedEmail(c, c.email);
        } else if (status === 'Closed') {
          await notificationService.sendClosedEmail(c, c.email);
        }
        await NotificationLog.create({ complaint: c._id, to_email: c.email || null, event: status });
      }
    } catch (err) {
      console.error('[officer] notification error', err && err.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
