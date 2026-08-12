/*
  Script to send a test 'Complaint Registered' email using notificationService.
  Usage: node scripts/send_test_email.js recipient@example.com
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/${process.env.MONGO_DBNAME || 'SPGMS'}`;

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[send_test_email] connected to mongo');
  const notificationService = require('../src/services/notificationService');

  const to = process.argv[2] || 'dilipsuvarna105@gmail.com';

  const sampleComplaint = {
    complaintId: 'TST-2026-000001',
    name: 'Test User',
    department: 'Water',
    priority: 'High',
    status: 'Registered',
    expectedResolution: '2026-08-10',
    officerRemarks: 'N/A'
  };

  console.log('[send_test_email] sending to', to);
  const res = await notificationService.sendComplaintRegisteredEmail(sampleComplaint, to);
  console.log('[send_test_email] result', res);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[send_test_email] error', err && err.message);
  process.exit(1);
});
