const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['admin-register', 'tenant-register'], required: true },
  registrationData: {
    username: { type: String },
    passwordHash: { type: String },
    name: { type: String },
    phone: { type: String }
  },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// TTL index to purge expired documents automatically
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
