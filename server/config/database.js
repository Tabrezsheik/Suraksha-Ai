const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Fast fail in 5s if Atlas is unreachable
    });
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Action Required: Please whitelist your current IP address in MongoDB Atlas (Security -> Network Access).');
  }
};

module.exports = connectDB;

