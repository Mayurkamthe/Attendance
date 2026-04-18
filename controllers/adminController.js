const User = require('../models/User');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const xlsx = require('xlsx');

// Dashboard
exports.getDashboard = async (req, res) => {
  const [teachers, classes, students, todayAtt] = await Promise.all([
    User.countDocuments({ role: 'teacher' }),
    Class.countDocuments({ isActive: true }),
    Student.countDocuments({ isActive: true }),
    Attendance.countDocuments({ date: { $gte: new Date().setHours(0,0,0,0), $lt: new Date().setHours(23,59,59,999) } })
  ]);
  res.render('admin/dashboard', { title: 'Admin Dashboard', stats: { teachers, classes, students, todayAtt } });
};

// Classes
exports.getClasses = async (req, res) => {
  const classes = await Class.find().populate('classTeacher', 'name').sort({ year: 1 });
  const teachers = await User.find({ role: 'teacher', isActive: true });
  res.render('admin/classes', { title: 'Classes', classes, teachers, error: req.flash('error'), success: req.flash('success') });
};

exports.createClass = async (req, res) => {
  try {
    await Class.create(req.body);
    req.flash('success', 'Class created');
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect('/admin/classes');
};

exports.updateClass = async (req, res) => {
  try {
    await Class.findByIdAndUpdate(req.params.id, req.body);
    req.flash('success', 'Class updated');
  } catch {
    req.flash('error', 'Update failed');
  }
  res.redirect('/admin/classes');
};

exports.deleteClass = async (req, res) => {
  await Class.findByIdAndDelete(req.params.id);
  req.flash('success', 'Class deleted');
  res.redirect('/admin/classes');
};

// Teachers
exports.getTeachers = async (req, res) => {
  const teachers = await User.find({ role: 'teacher' }).populate('assignedClasses', 'name year');
  const classes = await Class.find({ isActive: true });
  res.render('admin/teachers', { title: 'Teachers', teachers, classes, error: req.flash('error'), success: req.flash('success') });
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, assignedClasses } = req.body;
    await User.create({ name, email, password, phone, role: 'teacher', assignedClasses: assignedClasses || [] });
    req.flash('success', 'Teacher added');
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect('/admin/teachers');
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, phone, assignedClasses, isActive } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      name, email, phone,
      assignedClasses: Array.isArray(assignedClasses) ? assignedClasses : (assignedClasses ? [assignedClasses] : []),
      isActive: isActive === 'on'
    });
    req.flash('success', 'Teacher updated');
  } catch {
    req.flash('error', 'Update failed');
  }
  res.redirect('/admin/teachers');
};

// Students
exports.getStudents = async (req, res) => {
  const { classId } = req.query;
  const classes = await Class.find({ isActive: true });
  let students = [];
  if (classId) students = await Student.find({ class: classId, isActive: true }).populate('class').sort({ rollNumber: 1 });
  res.render('admin/students', { title: 'Students', students, classes, selectedClass: classId, error: req.flash('error'), success: req.flash('success') });
};

exports.createStudent = async (req, res) => {
  try {
    await Student.create(req.body);
    req.flash('success', 'Student added');
  } catch (e) {
    req.flash('error', 'Failed: ' + e.message);
  }
  res.redirect('/admin/students' + (req.body.class ? '?classId=' + req.body.class : ''));
};

exports.updateStudent = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, req.body);
    req.flash('success', 'Student updated');
  } catch {
    req.flash('error', 'Update failed');
  }
  res.redirect('/admin/students');
};

exports.deleteStudent = async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  req.flash('success', 'Student deleted');
  res.redirect('/admin/students');
};

exports.bulkUpload = async (req, res) => {
  try {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    const classId = req.body.classId;
    let added = 0, skipped = 0;
    for (const row of rows) {
      try {
        await Student.create({
          name: row['Name'] || row['name'],
          rollNumber: String(row['Roll Number'] || row['rollNumber'] || row['Roll']),
          parentPhone: String(row['Parent Phone'] || row['parentPhone'] || row['Phone']),
          class: classId
        });
        added++;
      } catch { skipped++; }
    }
    req.flash('success', `Imported: ${added} students. Skipped: ${skipped} duplicates.`);
  } catch (e) {
    req.flash('error', 'Upload failed: ' + e.message);
  }
  res.redirect('/admin/students?classId=' + req.body.classId);
};

// Attendance
exports.getAttendance = async (req, res) => {
  const { classId, date, dateFrom, dateTo } = req.query;
  const classes = await Class.find({ isActive: true });
  let records = [], selectedDate = date || new Date().toISOString().split('T')[0];
  if (classId) {
    const query = { class: classId };
    if (dateFrom && dateTo) {
      query.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
    } else if (selectedDate) {
      const d = new Date(selectedDate);
      query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    records = await Attendance.find(query).populate('records.student').populate('markedBy', 'name').sort({ date: -1 });
  }
  res.render('admin/attendance', { title: 'Attendance', classes, records, selectedClass: classId, selectedDate, dateFrom, dateTo, error: req.flash('error'), success: req.flash('success') });
};

exports.editAttendance = async (req, res) => {
  try {
    const { attendanceId, studentId, status } = req.body;
    await Attendance.updateOne(
      { _id: attendanceId, 'records.student': studentId },
      { $set: { 'records.$.status': status } }
    );
    req.flash('success', 'Attendance updated');
  } catch {
    req.flash('error', 'Update failed');
  }
  res.redirect('/admin/attendance');
};

// Reports & Export
exports.getReports = async (req, res) => {
  const classes = await Class.find({ isActive: true });
  res.render('admin/reports', { title: 'Reports', classes, error: req.flash('error'), success: req.flash('success') });
};
