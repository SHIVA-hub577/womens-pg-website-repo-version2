const mongoose = require('mongoose');
const dns = require('dns');

// DNS fallback setup to prevent Atlas SRV resolution issues on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGODBURL;
    if (!mongoUri) {
      console.warn('MONGODB_URI is not defined in environment variables');
      return;
    }
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'womens-pg',
      serverSelectionTimeoutMS: 4000
    });
    console.log(`MongoDB Connected: ${conn.connection.host} [DB: womens-pg]`);
  } catch (error) {
    console.warn('\n================================================================');
    console.warn('MONGODB CONNECTION NOTICE: Could not connect to MongoDB Atlas.');
    console.warn('Reason: Your current IP address might not be in Atlas Whitelist.');
    console.warn('Fix: Go to MongoDB Atlas -> Network Access -> Add IP Address (0.0.0.0/0)');
    console.warn('================================================================\n');
  }
};

module.exports = connectDB;
