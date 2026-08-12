const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
  to_email: String,
  event: String,
  sent_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
