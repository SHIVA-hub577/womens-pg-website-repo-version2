const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  tenantName: { type: String },
  email: { type: String },
  status: { type: String, enum: ['SENT', 'FAILED'], required: true },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
}, {
  collection: 'notificationLogs'
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
