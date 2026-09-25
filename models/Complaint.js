const mongoose = require('mongoose');

const complaintUpdateSchema = new mongoose.Schema({
  authorRole: { type: String, enum: ['admin', 'worker', 'tenant'], required: true },
  authorName: { type: String, required: true },
  message: { type: String, required: true, trim: true },
  photo: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const complaintSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  description: { type: String, required: true, trim: true },
  photo: { type: String, default: null }, // Relative URL e.g. /uploads/complaints/...
  status: { 
    type: String, 
    enum: ['Raised', 'In Progress', 'Resolved'], 
    default: 'Raised' 
  },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  assignedWorkerName: { type: String, default: null },
  assignedWorkerEmail: { type: String, default: null },
  updates: [complaintUpdateSchema],
  resolutionNote: { type: String, default: null, trim: true },
  resolutionPhoto: { type: String, default: null }, // Relative URL e.g. /uploads/complaints/...
  resolvedByRole: { type: String, enum: ['admin', 'worker'], default: null },
  resolvedByName: { type: String, default: null },
  raisedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
}, { collection: 'tenant-complaints' });

module.exports = mongoose.model('Complaint', complaintSchema);

