const mongoose = require('mongoose');

const ComplaintDeleteRequestSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  complaint_id: { type: String, required: true },
  officer: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
  officer_name: String,
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'rejected', 'approved'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
  reviewed_at: Date,
  reviewed_by: String
});

module.exports = mongoose.model('ComplaintDeleteRequest', ComplaintDeleteRequestSchema);
