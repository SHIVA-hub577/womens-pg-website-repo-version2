const mongoose = require('mongoose');

const removedTenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  emergencyContactNumber: { type: String },
  relation: { type: String },
  age: { type: Number },
  gender: { type: String },
  roomNumber: { type: String, required: true },
  sharingType: { type: String },
  rent: { type: Number },
  advancePaid: { type: Number },
  joiningDate: { type: Date },
  removedAt: { type: Date, default: Date.now },
  removedBy: { type: String, default: 'admin' },
  removalReason: { type: String }
}, { collection: 'removed-tenants' });

module.exports = mongoose.model('RemovedTenant', removedTenantSchema);
