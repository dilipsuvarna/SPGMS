const mongoose = require('mongoose');

const ComplaintImageSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  path: String,
  source: { type: String, enum: ['complaint', 'completion'], default: 'complaint' }
});

module.exports = mongoose.model('ComplaintImage', ComplaintImageSchema);
