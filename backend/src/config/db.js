const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/spgms';
    await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || 'spgms' });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed');
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
