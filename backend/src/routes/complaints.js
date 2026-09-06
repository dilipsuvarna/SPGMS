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
const DeletedComplaint = require('../models/DeletedComplaint');
const { generateComplaintId } = require('../utils/complaintId');

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
    const { name, age, mobile, email, description, address, latitude, longitude } = req.body;
    const files = req.files || [];

    if (!name || !age || !mobile || !description || !email) return res.status(400).json({ error: 'Missing required fields (email is mandatory)' });
    if (!/^\d{10}$/.test(String(mobile))) return res.status(400).json({ error: 'Mobile number must contain exactly 10 digits' });
    if (files.length < 3) return res.status(400).json({ error: 'At least 3 images are required' });

    const analysis = await aiService.analyzeText(description || '');
    const department = analysis.department || classifyComplaint(description);
    const priority = analysis.priority || detectPriority(description);
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    let duplicate = null;
    const candidates = await Complaint.find({ department }).limit(50).exec();
    for (const r of candidates) {
      const existingLocation = r.location || r;
      if (existingLocation.latitude != null && existingLocation.longitude != null && !isNaN(lat) && !isNaN(lon)) {
        const dLat = Math.abs((existingLocation.latitude || 0) - lat);
        const dLon = Math.abs((existingLocation.longitude || 0) - lon);
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
      duplicate.affected_contacts = duplicate.affected_contacts || [];
      if (email && !duplicate.affected_contacts.some((contact) => contact.email && contact.email.toLowerCase() === email.toLowerCase())) {
        duplicate.affected_contacts.push({ name, email, mobile });
      }
      await duplicate.save();
      if (email) {
        try {
          await notificationService.sendComplaintRegisteredEmail(duplicate, email);
        } catch (err) {
          console.error('[complaints] duplicate notification error', err && err.message);
        }
      }
      return res.json({
        duplicate: true,
        affected: true,
        message: 'Similar complaint already exists',
        complaint_id: duplicate.complaint_id,
        status: duplicate.status,
        priority: duplicate.priority,
        affected_citizens: duplicate.affected_citizens
      });
    }

    const complaintId = await generateComplaintId(department);

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
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lon) ? null : lon,
      location: {
        address: address || null,
        latitude: isNaN(lat) ? null : lat,
        longitude: isNaN(lon) ? null : lon
      },
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
        const ci = new ComplaintImage({ complaint: comp._id, path: u.url, source: 'complaint' });
        await ci.save();
      }
    } else {
      for (const f of files) {
        const rel = path.relative(path.join(__dirname, '..', '..'), f.path).replace(/\\/g, '/');
        const ci = new ComplaintImage({ complaint: comp._id, path: rel, source: 'complaint' });
        await ci.save();
      }
    }

    try {
      await notificationService.sendComplaintRegisteredEmail(comp, email);
      await NotificationLog.create({ complaint: comp._id, to_email: email, event: 'registered' });
    } catch (err) {
      console.error('[complaints] notification error', err && err.message);
    }

    return res.json({ complaint_id: complaintId, status: 'Registered', department, priority, affected_citizens: 1 });
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
    if (!c) {
      const deleted = await DeletedComplaint.exists({ complaint_id });
      if (deleted) return res.status(410).json({ error: 'complaint_deleted_by_authority' });
      return res.status(404).json({ error: 'not_found' });
    }

    const imgs = await ComplaintImage.find({ complaint: c._id }).lean().exec();
    const completionImageSet = new Set(c.completion_images || []);
    const complaintImages = imgs
      .filter((image) => image.source !== 'completion' && !completionImageSet.has(image.path))
      .map((image) => image.path);
    const completionImages = [
      ...imgs.filter((image) => image.source === 'completion').map((image) => image.path),
      ...(c.completion_images || [])
    ].filter((image, index, all) => all.indexOf(image) === index);

    return res.json({ complaint: c, images: complaintImages, complaintImages, completionImages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
