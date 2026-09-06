const mongoose = require('mongoose');

const DeletedComplaintSchema = new mongoose.Schema({
  complaint_id: { type: String, unique: true, required: true },
  deleted_at: { type: Date, default: Date.now },
  deleted_by: { type: String, required: true }
});

module.exports = mongoose.model('DeletedComplaint', DeletedComplaintSchema);
