const mongoose = require('mongoose');

const tenantRemovalSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  initiatedBy: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { collection: 'tenant-removals' });

// TTL index to purge expired removal requests automatically after 24 hours
tenantRemovalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TenantRemoval', tenantRemovalSchema);
