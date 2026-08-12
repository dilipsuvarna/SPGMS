const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'spgms.db');
const db = new Database(dbPath);

function seed() {
  const officers = [
    { department: 'Water', name: 'Water Officer', email: 'water.officer@spgms.local', password: 'waterpass' },
    { department: 'Waste', name: 'Waste Officer', email: 'waste.officer@spgms.local', password: 'wastepass' },
    { department: 'Electricity', name: 'Electricity Officer', email: 'electricity.officer@spgms.local', password: 'electricpass' },
    { department: 'Road', name: 'Road Officer', email: 'road.officer@spgms.local', password: 'roadpass' }
  ];

  const insert = db.prepare('INSERT INTO officers (department, name, email, password_hash) VALUES (?, ?, ?, ?)');
  const exists = db.prepare('SELECT COUNT(*) as cnt FROM officers').get();
  if (exists && exists.cnt > 0) {
    console.log('Officers already seeded');
    process.exit(0);
  }

  for (const o of officers) {
    const hash = bcrypt.hashSync(o.password, 10);
    insert.run(o.department, o.name, o.email, hash);
    console.log('Inserted officer', o.email, 'password:', o.password);
  }
  console.log('Seeding complete');
}

seed();
