const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  parentPhone: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  email: { type: String, lowercase: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
