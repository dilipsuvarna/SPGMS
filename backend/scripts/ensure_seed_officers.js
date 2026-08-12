require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Officer = require('../src/models/Officer');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spgms';
  await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || 'spgms' });

  const officers = [
    { department: 'Water', name: 'Water Officer', email: 'water.officer@spgms.local', password: 'waterpass' },
    { department: 'Waste', name: 'Waste Officer', email: 'waste.officer@spgms.local', password: 'wastepass' },
    { department: 'Electricity', name: 'Electricity Officer', email: 'electricity.officer@spgms.local', password: 'electricpass' },
    { department: 'Road', name: 'Road Officer', email: 'road.officer@spgms.local', password: 'roadpass' }
  ];

  for (const o of officers) {
    const hash = bcrypt.hashSync(o.password, 10);
    try {
      await Officer.updateOne(
        { email: o.email },
        { $setOnInsert: { department: o.department, name: o.name, email: o.email, password_hash: hash } },
        { upsert: true }
      );
      console.log('Ensured officer', o.email, 'password:', o.password);
    } catch (err) {
      console.error('Error seeding officer', o.email, err.message || err);
    }
  }

  console.log('Seeding/upsert complete');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
