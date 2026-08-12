const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { classifyComplaint, detectPriority, descriptionSimilarity } = require('../utils/classifier');
const notificationService = require('../services/notificationService');
const aiService = require('../services/aiService');

const Complaint = require('../models/Complaint');
const ComplaintImage = require('../models/ComplaintImage');
const NotificationLog = require('../models/NotificationLog');

// store uploads in backend/uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPG, JPEG and PNG are allowed.'), false);
}

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 5 }, fileFilter });

router.post('/analyze', express.json(), async (req, res) => {
  try {
    const { text } = req.body || {};
    const analysis = await aiService.analyzeText(text || '');
    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Register complaint
router.post('/register', upload.array('images', 5), async (req, res) => {
  try {
    const { name, age, mobile, email, description, address, place_id, latitude, longitude } = req.body;
    const files = req.files || [];

    if (!name || !age || !mobile || !description || !email) return res.status(400).json({ error: 'Missing required fields (email is mandatory)' });
    if (files.length < 3) return res.status(400).json({ error: 'At least 3 images are required' });

    const analysis = await aiService.analyzeText(description || '');
    const department = analysis.department || classifyComplaint(description);
    const priority = analysis.priority || detectPriority(description);
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    let duplicate = null;
    const candidates = await Complaint.find({ department }).limit(50).exec();
    for (const r of candidates) {
      if (r.latitude != null && r.longitude != null && !isNaN(lat) && !isNaN(lon)) {
        const dLat = Math.abs((r.latitude || 0) - lat);
        const dLon = Math.abs((r.longitude || 0) - lon);
        if (dLat <= 0.01 && dLon <= 0.01) {
          const sim = descriptionSimilarity(r.description || '', description);
          if (sim >= 0.6) {
            duplicate = r;
            break;
          }
        }
      } else {
        const sim = descriptionSimilarity(r.description || '', description);
        if (sim >= 0.8) {
          duplicate = r;
          break;
        }
      }
    }

    if (duplicate) {
      const linkEntry = new NotificationLog({ complaint: duplicate._id, to_email: email, event: 'linked' });
      await linkEntry.save();
      duplicate.affected_citizens = (duplicate.affected_citizens || 1) + 1;
      await duplicate.save();
      if (email) {
        try {
          await notificationService.sendComplaintRegisteredEmail(duplicate, email);
        } catch (err) {
          console.error('[complaints] duplicate notification error', err && err.message);
        }
      }
      return res.json({ duplicate: true, message: 'Similar complaint already exists', complaint_id: duplicate.complaint_id });
    }

    const codes = { Water: 'WTR', Waste: 'WST', Electricity: 'ELE', Road: 'ROD' };
    const code = codes[department] || 'OTH';
    const year = new Date().getFullYear();
    const likePattern = new RegExp('^' + code + '-' + year + '-');
    const existing = await Complaint.find({ complaint_id: { $regex: likePattern } }).countDocuments();
    const seq = (existing + 1).toString().padStart(6, '0');
    const complaintId = `${code}-${year}-${seq}`;

    const cloudinaryService = require('../services/cloudinaryService');
    const uploaded = [];
    try {
      if (cloudinaryService.configured) {
        for (const f of files) {
          const r = await cloudinaryService.uploadFile(f.path);
          if (!r.ok) {
            for (const u of uploaded) {
              if (u.public_id) await cloudinaryService.destroy(u.public_id);
            }
            console.error('[complaints] cloudinary upload failed', r.error);
            return res.status(500).json({ error: 'image_upload_failed' });
          }
          uploaded.push(r);
        }
      }
    } catch (err) {
      console.error('[complaints] cloudinary upload exception', err && err.message);
      for (const u of uploaded) {
        if (u.public_id) await cloudinaryService.destroy(u.public_id);
      }
      return res.status(500).json({ error: 'image_upload_failed' });
    }

    const comp = new Complaint({
      complaint_id: complaintId,
      name,
      age,
      mobile,
      email,
      description,
      department,
      priority,
      address: address || null,
      place_id: place_id || null,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lon) ? null : lon,
      status: 'Registered',
      ai_department: department,
      ai_priority: priority,
      ai_department_confidence: analysis.departmentConfidence,
      ai_priority_confidence: analysis.priorityConfidence,
      ai_keywords: analysis.keywords || [],
      ai_emergency_indicators: analysis.emergencyIndicators || [],
      timeline: [{ status: 'Registered', timestamp: new Date(), remarks: 'Complaint registered', by: 'system' }]
    });
    await comp.save();

    if (uploaded.length > 0) {
      for (const u of uploaded) {
        const ci = new ComplaintImage({ complaint: comp._id, path: u.url });
        await ci.save();
      }
    } else {
      for (const f of files) {
        const rel = path.relative(path.join(__dirname, '..', '..'), f.path).replace(/\\/g, '/');
        const ci = new ComplaintImage({ complaint: comp._id, path: rel });
        await ci.save();
      }
    }

    try {
      await notificationService.sendComplaintRegisteredEmail(comp, email);
      await NotificationLog.create({ complaint: comp._id, to_email: email, event: 'registered' });
    } catch (err) {
      console.error('[complaints] notification error', err && err.message);
    }

    return res.json({ complaint_id: complaintId, status: 'Registered', department, priority });
  } catch (err) {
    console.error('Error registering complaint', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Track complaint by complaint_id
router.get('/track/:complaint_id', async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const c = await Complaint.findOne({ complaint_id }).lean().exec();
    if (!c) return res.status(404).json({ error: 'not_found' });

    const imgs = await ComplaintImage.find({ complaint: c._id }).lean().exec();
    const imgPaths = imgs.map(i => i.path);

    return res.json({ complaint: c, images: imgPaths });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
