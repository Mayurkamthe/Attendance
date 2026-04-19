const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const xlsx = require('xlsx');

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const [teachers, classes, students, todayAtt] = await Promise.all([
      User.countDocuments({ role: 'teacher' }),
      Class.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true }),
      Attendance.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } })
    ]);
    res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { teachers, classes, students, todayAtt } });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { teachers:0, classes:0, students:0, todayAtt:0 } });
  }
};

// ── Classes ──────────────────────────────────────────────────────────────────
exports.getClasses = async (req, res) => {
  const classes  = await Class.find().populate('classTeacher', 'name').sort({ year: 1 });
  const teachers = await User.find({ role: 'teacher', isActive: true });
  res.render('admin/classes', { title: 'Classes', classes, teachers, error: req.flash('error'), success: req.flash('success') });
};

exports.createClass = async (req, res) => {
  try {
    const { name, year, division, department, classTeacher } = req.body;
    await Class.create({ name, year, division, department, classTeacher: classTeacher || undefined });
    req.flash('success', 'Class created successfully');
  } catch (e) {
    req.flash('error', 'Failed to create class: ' + e.message);
  }
  res.redirect('/admin/classes');
};

exports.updateClass = async (req, res) => {
  try {
    const { name, year, division, department, classTeacher } = req.body;
    await Class.findByIdAndUpdate(req.params.id, { name, year, division, department, classTeacher: classTeacher || null });
    req.flash('success', 'Class updated');
  } catch (e) {
    req.flash('error', 'Update failed: ' + e.message);
  }
  res.redirect('/admin/classes');
};

exports.deleteClass = async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    req.flash('success', 'Class deleted');
  } catch (e) {
    req.flash('error', 'Delete failed');
  }
  res.redirect('/admin/classes');
};

// ── Teachers ─────────────────────────────────────────────────────────────────
exports.getTeachers = async (req, res) => {
  const teachers = await User.find({ role: 'teacher' }).populate('assignedClasses', 'name year');
  const classes  = await Class.find({ isActive: true });
  res.render('admin/teachers', { title: 'Teachers', teachers, classes, error: req.flash('error'), success: req.flash('success') });
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, assignedClasses } = req.body;
    const classes = Array.isArray(assignedClasses) ? assignedClasses : (assignedClasses ? [assignedClasses] : []);
    await User.create({ name, email: email.trim().toLowerCase(), password, phone, role: 'teacher', assignedClasses: classes });
    req.flash('success', 'Teacher added successfully');
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect('/admin/teachers');
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, phone, assignedClasses, isActive } = req.body;
    const classes = Array.isArray(assignedClasses) ? assignedClasses : (assignedClasses ? [assignedClasses] : []);
    await User.findByIdAndUpdate(req.params.id, {
      name, email: email.trim().toLowerCase(), phone,
      assignedClasses: classes,
      isActive: isActive === 'on'
    });
    req.flash('success', 'Teacher updated');
  } catch (e) {
    req.flash('error', 'Update failed: ' + e.message);
  }
  res.redirect('/admin/teachers');
};

// ── Students ──────────────────────────────────────────────────────────────────
exports.getStudents = async (req, res) => {
  try {
    const { classId } = req.query;
    const classes = await Class.find({ isActive: true }).sort({ name: 1 });
    let students = [];
    if (classId && classId !== '') {
      students = await Student.find({ class: classId, isActive: true })
        .populate('class', 'name year')
        .sort({ rollNumber: 1 });
    }
    res.render('admin/students', {
      title: 'Students', students, classes,
      selectedClass: classId || '',
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (e) {
    console.error('getStudents error:', e);
    res.render('admin/students', {
      title: 'Students', students: [], classes: [],
      selectedClass: '',
      error: 'Failed to load students: ' + e.message,
      success: ''
    });
  }
};

exports.createStudent = async (req, res) => {
  const classId = req.body.class || '';
  try {
    const { name, rollNumber, parentPhone } = req.body;
    if (!name || !rollNumber || !parentPhone || !classId) {
      req.flash('error', 'All fields are required');
      return res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
    }
    await Student.create({ name: name.trim(), rollNumber: rollNumber.trim(), parentPhone: parentPhone.trim(), class: classId });
    req.flash('success', 'Student added successfully');
  } catch (e) {
    if (e.code === 11000) {
      req.flash('error', 'Roll number already exists in this class');
    } else {
      req.flash('error', 'Failed to add student: ' + e.message);
    }
  }
  res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, rollNumber, parentPhone } = req.body;
    // Only update safe fields, never change the class via this route
    await Student.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      parentPhone: parentPhone.trim()
    });
    req.flash('success', 'Student updated');
  } catch (e) {
    if (e.code === 11000) {
      req.flash('error', 'Roll number already exists in this class');
    } else {
      req.flash('error', 'Update failed: ' + e.message);
    }
  }
  // Redirect back to the class the student belongs to
  const student = await Student.findById(req.params.id).catch(() => null);
  const classId = student ? student.class : '';
  res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    const classId = student ? student.class : '';
    await Student.findByIdAndDelete(req.params.id);
    req.flash('success', 'Student deleted');
    return res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
  } catch (e) {
    req.flash('error', 'Delete failed');
    res.redirect('/admin/students');
  }
};

exports.bulkUpload = async (req, res) => {
  const classId = req.body.classId || '';
  try {
    if (!req.file) {
      req.flash('error', 'No file uploaded');
      return res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
    }
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    let added = 0, skipped = 0, errors = [];
    for (const row of rows) {
      try {
        const name        = row['Name'] || row['name'] || row['NAME'];
        const rollNumber  = String(row['Roll Number'] || row['rollNumber'] || row['Roll'] || row['ROLL'] || '');
        const parentPhone = String(row['Parent Phone'] || row['parentPhone'] || row['Phone'] || row['PHONE'] || '');
        if (!name || !rollNumber || !parentPhone) { skipped++; continue; }
        await Student.create({ name: name.trim(), rollNumber: rollNumber.trim(), parentPhone: parentPhone.trim(), class: classId });
        added++;
      } catch (e) {
        if (e.code === 11000) skipped++;
        else errors.push(e.message);
      }
    }
    let msg = `Imported: ${added} students.`;
    if (skipped > 0) msg += ` Skipped ${skipped} (duplicates/invalid).`;
    req.flash('success', msg);
  } catch (e) {
    req.flash('error', 'Upload failed: ' + e.message);
  }
  res.redirect('/admin/students' + (classId ? '?classId=' + classId : ''));
};

// ── Attendance ────────────────────────────────────────────────────────────────
exports.getAttendance = async (req, res) => {
  const { classId, date, dateFrom, dateTo } = req.query;
  const classes = await Class.find({ isActive: true });
  let records = [];
  let selectedDate = date || new Date().toISOString().split('T')[0];
  try {
    if (classId) {
      const query = { class: classId };
      if (dateFrom && dateTo) {
        query.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo + 'T23:59:59') };
      } else if (selectedDate) {
        const d = new Date(selectedDate);
        query.date = {
          $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          $lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
        };
      }
      records = await Attendance.find(query)
        .populate('records.student', 'name rollNumber parentPhone')
        .populate('markedBy', 'name')
        .sort({ date: -1 });
    }
  } catch (e) {
    console.error('Attendance fetch error:', e);
  }
  res.render('admin/attendance', {
    title: 'Attendance', classes, records,
    selectedClass: classId || '', selectedDate, dateFrom: dateFrom || '', dateTo: dateTo || '',
    error: req.flash('error'), success: req.flash('success')
  });
};

exports.editAttendance = async (req, res) => {
  try {
    const { attendanceId, studentId, status } = req.body;
    await Attendance.updateOne(
      { _id: attendanceId, 'records.student': studentId },
      { $set: { 'records.$.status': status } }
    );
    req.flash('success', 'Attendance updated');
  } catch (e) {
    req.flash('error', 'Update failed: ' + e.message);
  }
  res.redirect('/admin/attendance');
};

// ── Reports ───────────────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  const classes = await Class.find({ isActive: true });
  res.render('admin/reports', { title: 'Reports', classes, error: req.flash('error'), success: req.flash('success') });
};
