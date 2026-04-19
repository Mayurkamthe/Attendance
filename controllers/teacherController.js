const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

exports.getDashboard = async (req, res) => {
  const classes = await Class.find({ _id: { $in: req.user.assignedClasses } });
  res.render('teacher/dashboard', { title: 'Teacher Dashboard', classes });
};

exports.getMarkAttendance = async (req, res) => {
  const { classId, date, subject } = req.query;
  const classes = await Class.find({ _id: { $in: req.user.assignedClasses } });
  let students = [], existing = null, selectedDate = date || new Date().toISOString().split('T')[0];
  if (classId) {
    students = await Student.find({ class: classId, isActive: true }).sort({ rollNumber: 1 });
    const d = new Date(selectedDate);
    const query = {
      class: classId,
      date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) },
      subject: subject || ''
    };
    existing = await Attendance.findOne(query).populate('records.student');
  }
  res.render('teacher/mark-attendance', { title: 'Mark Attendance', classes, students, existing, selectedClass: classId, selectedDate, selectedSubject: subject || '', error: req.flash('error'), success: req.flash('success') });
};

exports.postMarkAttendance = async (req, res) => {
  try {
    const { classId, date, subject, statuses } = req.body;
    const d = new Date(date);

    // Check time window
    const now = new Date();
    const [startH, startM] = process.env.ATTENDANCE_START.split(':').map(Number);
    const [endH, endM] = process.env.ATTENDANCE_END.split(':').map(Number);
    const start = startH * 60 + startM, end = endH * 60 + endM;
    const cur = now.getHours() * 60 + now.getMinutes();
    if (cur < start || cur > end) {
      req.flash('error', `Attendance can only be marked between ${process.env.ATTENDANCE_START} and ${process.env.ATTENDANCE_END}`);
      return res.redirect('/teacher/attendance?classId=' + classId + '&date=' + date + (subject ? '&subject=' + encodeURIComponent(subject) : ''));
    }

    const records = Object.entries(statuses || {}).map(([studentId, status]) => ({ student: studentId, status }));
    const subjectVal = subject || '';
    await Attendance.findOneAndUpdate(
      { class: classId, date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) }, subject: subjectVal },
      { class: classId, date: new Date(date), subject: subjectVal, markedBy: req.user._id, records },
      { upsert: true, new: true }
    );
    req.flash('success', 'Attendance saved' + (subjectVal ? ' for ' + subjectVal : ''));
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect('/teacher/attendance?classId=' + req.body.classId + '&date=' + req.body.date + (req.body.subject ? '&subject=' + encodeURIComponent(req.body.subject) : ''));
};

exports.getViewAttendance = async (req, res) => {
  const { classId, dateFrom, dateTo } = req.query;
  const classes = await Class.find({ _id: { $in: req.user.assignedClasses } });
  let records = [];
  if (classId) {
    const query = { class: classId };
    if (dateFrom && dateTo) query.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
    records = await Attendance.find(query).populate('records.student').sort({ date: -1 });
  }
  res.render('teacher/view-attendance', { title: 'View Attendance', classes, records, selectedClass: classId, dateFrom, dateTo });
};
