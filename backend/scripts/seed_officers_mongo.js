require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Officer = require('../src/models/Officer');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spgms';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || 'spgms' });

  const existing = await Officer.countDocuments();
  if (existing > 0) {
    console.log('Officers already exist, aborting seed');
    process.exit(0);
  }

  const officers = [
    { department: 'Water', name: 'Water Officer', email: 'water.officer@spgms.local', password: 'waterpass' },
    { department: 'Waste', name: 'Waste Officer', email: 'waste.officer@spgms.local', password: 'wastepass' },
    { department: 'Electricity', name: 'Electricity Officer', email: 'electricity.officer@spgms.local', password: 'electricpass' },
    { department: 'Road', name: 'Road Officer', email: 'road.officer@spgms.local', password: 'roadpass' }
  ];

  for (const o of officers) {
    const hash = await bcrypt.hash(o.password, 10);
    await Officer.create({ department: o.department, name: o.name, email: o.email, password_hash: hash });
    console.log('Inserted officer', o.email, 'password:', o.password);
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });