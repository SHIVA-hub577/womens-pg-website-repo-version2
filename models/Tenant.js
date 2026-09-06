const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String },
  phone: { type: String },
  googleId: { type: String },
  tenantId: { type: String },
  roomNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', tenantSchema);
