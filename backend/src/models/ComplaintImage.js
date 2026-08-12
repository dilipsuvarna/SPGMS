const mongoose = require('mongoose');

const ComplaintImageSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  path: String
});

module.exports = mongoose.model('ComplaintImage', ComplaintImageSchema);
