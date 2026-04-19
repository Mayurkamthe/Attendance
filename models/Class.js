const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  year: { type: String, enum: ['FY', 'SY', 'TE', 'BE', '11th', '12th', 'Other'], required: true },
  customYear: { type: String, trim: true }, // used when year === 'Other'
  division: { type: String, trim: true },
  department: { type: String, trim: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

classSchema.virtual('fullName').get(function () {
  const yr = this.year === 'Other' && this.customYear ? this.customYear : this.year;
  return `${yr}${this.division ? ' ' + this.division : ''}${this.department ? ' - ' + this.department : ''}`;
});

module.exports = mongoose.model('Class', classSchema);
