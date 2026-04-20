const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  code:      { type: String, trim: true },
  class:     { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  teacher:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive:  { type: Boolean, default: true }
}, { timestamps: true });

// A subject name should be unique per class
subjectSchema.index({ name: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
