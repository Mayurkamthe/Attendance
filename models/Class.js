const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  year: { type: String, enum: ['FY', 'SY', 'TE', 'BE', 'Other'], required: true },
  division: { type: String, trim: true },
  department: { type: String, trim: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

classSchema.virtual('fullName').get(function () {
  return `${this.year}${this.division ? ' ' + this.division : ''}${this.department ? ' - ' + this.department : ''}`;
});

module.exports = mongoose.model('Class', classSchema);
