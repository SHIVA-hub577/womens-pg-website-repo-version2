const mongoose = require('mongoose');

const embeddedTenantSchema = new mongoose.Schema({
  tenantId: { type: String },
  name: { type: String },
  age: { type: Number },
  gender: { type: String },
  phone: { type: String },
  email: { type: String, lowercase: true, trim: true },
  joiningDate: { type: Date },
  rent: { type: Number },
  advancePaid: { type: Number },
  status: { type: String }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  sharingType: { type: Number, required: true },
  rent: { type: Number, required: true },
  advance: { type: Number, required: true },
  status: { type: String, required: true },
  capacity: { type: Number, required: true },
  tenants: [embeddedTenantSchema]
}, { collection: 'room-data' });

module.exports = mongoose.model('Room', roomSchema);
