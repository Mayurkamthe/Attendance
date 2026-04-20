const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');

exports.getDashboard = async (req, res) => {
  // Get subjects assigned to this teacher, grouped by class
  const subjects = await Subject.find({ teacher: req.user._id, isActive: true })
    .populate('class', 'name year department')
    .sort({ 'class.name': 1, name: 1 });

  // Group subjects by class
  const classMap = {};
  for (const subj of subjects) {
    const cid = subj.class._id.toString();
    if (!classMap[cid]) classMap[cid] = { cls: subj.class, subjects: [] };
    classMap[cid].subjects.push(subj);
  }
  const assignedGroups = Object.values(classMap);

  res.render('teacher/dashboard', { title: 'Teacher Dashboard', assignedGroups });
};

exports.getMarkAttendance = async (req, res) => {
  const { subjectId, date } = req.query;

  // Load only subjects assigned to this teacher
  const mySubjects = await Subject.find({ teacher: req.user._id, isActive: true })
    .populate('class', 'name year department')
    .sort({ name: 1 });

  let students = [], existing = null, selectedSubject = null;
  const selectedDate = date || new Date().toISOString().split('T')[0];

  if (subjectId) {
    selectedSubject = mySubjects.find(s => s._id.toString() === subjectId);
    // Security: teacher can only mark their own subjects
    if (!selectedSubject) {
      req.flash('error', 'Subject not found or not assigned to you');
      return res.redirect('/teacher/attendance');
    }
    students = await Student.find({ class: selectedSubject.class._id, isActive: true }).sort({ rollNumber: 1 });
    const d = new Date(selectedDate);
    existing = await Attendance.findOne({
      class: selectedSubject.class._id,
      subject: selectedSubject.name,
      date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) }
    }).populate('records.student');
  }

  res.render('teacher/mark-attendance', {
    title: 'Mark Attendance',
    mySubjects,
    students,
    existing,
    selectedSubject,
    selectedSubjectId: subjectId || '',
    selectedDate,
    error: req.flash('error'),
    success: req.flash('success')
  });
};

exports.postMarkAttendance = async (req, res) => {
  const { subjectId, date, statuses } = req.body;
  try {
    // Verify teacher owns this subject
    const subject = await Subject.findOne({ _id: subjectId, teacher: req.user._id, isActive: true })
      .populate('class', 'name');
    if (!subject) {
      req.flash('error', 'Subject not found or not assigned to you');
      return res.redirect('/teacher/attendance');
    }

    // Check time window
    const now = new Date();
    const [startH, startM] = (process.env.ATTENDANCE_START || '00:00').split(':').map(Number);
    const [endH,   endM]   = (process.env.ATTENDANCE_END   || '23:59').split(':').map(Number);
    const start = startH * 60 + startM, end = endH * 60 + endM;
    const cur   = now.getHours() * 60 + now.getMinutes();
    if (cur < start || cur > end) {
      req.flash('error', `Attendance can only be marked between ${process.env.ATTENDANCE_START} and ${process.env.ATTENDANCE_END}`);
      return res.redirect(`/teacher/attendance?subjectId=${subjectId}&date=${date}`);
    }

    const d = new Date(date);
    const records = Object.entries(statuses || {}).map(([studentId, status]) => ({ student: studentId, status }));

    await Attendance.findOneAndUpdate(
      {
        class: subject.class._id,
        subject: subject.name,
        date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) }
      },
      { class: subject.class._id, subject: subject.name, date: new Date(date), markedBy: req.user._id, records },
      { upsert: true, new: true }
    );
    req.flash('success', `Attendance saved for ${subject.name}`);
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect(`/teacher/attendance?subjectId=${subjectId}&date=${date}`);
};

exports.getViewAttendance = async (req, res) => {
  const { subjectId, dateFrom, dateTo } = req.query;

  const mySubjects = await Subject.find({ teacher: req.user._id, isActive: true })
    .populate('class', 'name year')
    .sort({ name: 1 });

  let records = [], selectedSubject = null;
  if (subjectId) {
    selectedSubject = mySubjects.find(s => s._id.toString() === subjectId);
    if (selectedSubject) {
      const query = { class: selectedSubject.class._id, subject: selectedSubject.name };
      if (dateFrom && dateTo) query.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo + 'T23:59:59') };
      records = await Attendance.find(query).populate('records.student').sort({ date: -1 });
    }
  }

  res.render('teacher/view-attendance', {
    title: 'View Records',
    mySubjects,
    records,
    selectedSubjectId: subjectId || '',
    selectedSubject,
    dateFrom: dateFrom || '',
    dateTo: dateTo || ''
  });
};
