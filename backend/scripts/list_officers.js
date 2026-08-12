require('dotenv').config();
const mongoose = require('mongoose');
const Officer = require('../src/models/Officer');

async function list() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spgms';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || 'spgms' });
  const rows = await Officer.find().lean().exec();
  console.log('Officers:', rows.map(r => ({ id: r._id, email: r.email, department: r.department })));
  await mongoose.disconnect();
}

list().catch(err => { console.error(err); process.exit(1); });
