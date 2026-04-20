const Class   = require('../models/Class');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { checkAttendanceWindow } = require('../utils/time');

// ── Helper: date range for a single day ──────────────────────────────────────
function dayRange(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,  0,  0);
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { $gte: start, $lte: end };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const subjects = await Subject.find({ teacher: req.user._id, isActive: true })
    .populate('class', 'name year department')
    .sort({ name: 1 });

  const classMap = {};
  for (const subj of subjects) {
    const cid = subj.class._id.toString();
    if (!classMap[cid]) classMap[cid] = { cls: subj.class, subjects: [] };
    classMap[cid].subjects.push(subj);
  }
  const assignedGroups = Object.values(classMap);

  res.render('teacher/dashboard', { title: 'Teacher Dashboard', assignedGroups });
};

// ── GET Mark Attendance ───────────────────────────────────────────────────────
exports.getMarkAttendance = async (req, res) => {
  const { subjectId, date } = req.query;

  const mySubjects = await Subject.find({ teacher: req.user._id, isActive: true })
    .populate('class', 'name year department')
    .sort({ name: 1 });

  let students = [], existing = null, selectedSubject = null;
  const selectedDate = date || new Date().toISOString().split('T')[0];

  if (subjectId) {
    selectedSubject = mySubjects.find(s => s._id.toString() === subjectId);
    if (!selectedSubject) {
      req.flash('error', 'Subject not found or not assigned to you');
      return res.redirect('/teacher/attendance');
    }
    students = await Student.find({ class: selectedSubject.class._id, isActive: true }).sort({ rollNumber: 1 });
    existing = await Attendance.findOne({
      class:   selectedSubject.class._id,
      subject: selectedSubject.name,
      date:    dayRange(selectedDate)
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
    error:   req.flash('error'),
    success: req.flash('success')
  });
};

// ── POST Mark Attendance ──────────────────────────────────────────────────────
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

    // ── Time window check (timezone-aware) ──────────────────────────────────
    const window = checkAttendanceWindow();
    if (!window.allowed) {
      req.flash('error', window.message);
      return res.redirect(`/teacher/attendance?subjectId=${subjectId}&date=${date}`);
    }

    const records = Object.entries(statuses || {}).map(([studentId, status]) => ({
      student: studentId,
      status
    }));

    await Attendance.findOneAndUpdate(
      {
        class:   subject.class._id,
        subject: subject.name,
        date:    dayRange(date)
      },
      {
        class:    subject.class._id,
        subject:  subject.name,
        date:     new Date(date),
        markedBy: req.user._id,
        records
      },
      { upsert: true, new: true }
    );

    req.flash('success', `Attendance saved for ${subject.name}`);
  } catch (e) {
    console.error('postMarkAttendance error:', e);
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect(`/teacher/attendance?subjectId=${subjectId}&date=${date}`);
};

// ── View Records ──────────────────────────────────────────────────────────────
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
      if (dateFrom && dateTo) {
        query.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo + 'T23:59:59') };
      }
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
    dateTo:   dateTo   || ''
  });
};
