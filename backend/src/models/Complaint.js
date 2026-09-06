const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaint_id: { type: String, unique: true },
  name: String,
  age: Number,
  mobile: String,
  email: { type: String, required: true },
  description: String,
  department: String,
  priority: String,
  address: String,
  latitude: Number,
  longitude: Number,
  location: {
    address: String,
    latitude: Number,
    longitude: Number
  },
  status: String,
  assigned_officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
  assignedOfficerName: String,
  transfer_history: [{
    previous_complaint_id: String,
    previous_department: String,
    new_complaint_id: String,
    new_department: String,
    transferred_at: Date,
    transferred_by: String,
    assigned_officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' }
  }],
  affected_citizens: { type: Number, default: 1 },
  affected_contacts: [{
    name: String,
    email: String,
    mobile: String
  }],
  expected_resolution_date: String,
  officer_remarks: String,
  completion_images: [{ type: String }],
  ai_department: String,
  ai_priority: String,
  ai_department_confidence: Number,
  ai_priority_confidence: Number,
  ai_keywords: [{ type: String }],
  ai_emergency_indicators: [{ type: String }],
  timeline: [{ status: String, timestamp: Date, remarks: String, by: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
