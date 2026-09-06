const mongoose = require('mongoose');

const rentPaymentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  month: { type: String, required: true }, // Format 'YYYY-MM'
  amountPaid: { type: Number, required: true, default: 0 },
  paymentDate: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Partial'], 
    default: 'Pending' 
  },
  updatedBy: { type: String, default: null } // admin or tenant email / identifier
}, { 
  collection: 'rentPayments',
  timestamps: true
});

// Enforce one payment record per tenant per month at database level
rentPaymentSchema.index({ tenantId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('RentPayment', rentPaymentSchema);
