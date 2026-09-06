const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  description: { type: String, required: true, trim: true },
  photo: { type: String, default: null }, // Relative URL e.g. /uploads/complaints/...
  status: { 
    type: String, 
    enum: ['Raised', 'Resolved'], 
    default: 'Raised' 
  },
  resolutionNote: { type: String, default: null, trim: true },
  resolutionPhoto: { type: String, default: null }, // Relative URL e.g. /uploads/complaints/...
  raisedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
}, { collection: 'tenant-complaints' });

module.exports = mongoose.model('Complaint', complaintSchema);
