const mongoose = require('mongoose');
const crypto = require('crypto');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  parentPhone: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  email: { type: String, lowercase: true },
  isActive: { type: Boolean, default: true },
  parentToken: { type: String, unique: true, sparse: true }
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, class: 1 }, { unique: true });

// Auto-generate a unique token before saving if not set
studentSchema.pre('save', function(next) {
  if (!this.parentToken) {
    this.parentToken = crypto.randomBytes(20).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);
