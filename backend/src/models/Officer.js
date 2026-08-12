const mongoose = require('mongoose');

const OfficerSchema = new mongoose.Schema({
  department: { type: String, required: true },
  name: String,
  email: { type: String, unique: true },
  password_hash: String
});

module.exports = mongoose.model('Officer', OfficerSchema);
