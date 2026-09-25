const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  specialization: { type: String, default: 'General Maintenance' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'workers' });

module.exports = mongoose.model('Worker', workerSchema);
