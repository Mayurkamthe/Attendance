const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, adminOnly } = require('../middleware/auth');
const admin = require('../controllers/adminController');
const exp = require('../controllers/exportController');

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, adminOnly);

router.get('/dashboard', admin.getDashboard);

router.get('/classes', admin.getClasses);
router.post('/classes', admin.createClass);
router.post('/classes/:id/update', admin.updateClass);
router.post('/classes/:id/delete', admin.deleteClass);

router.get('/teachers', admin.getTeachers);
router.post('/teachers', admin.createTeacher);
router.post('/teachers/:id/update', admin.updateTeacher);

router.get('/students', admin.getStudents);
router.post('/students', admin.createStudent);
router.post('/students/:id/update', admin.updateStudent);
router.post('/students/:id/delete', admin.deleteStudent);
router.post('/students/bulk-upload', upload.single('file'), admin.bulkUpload);

router.get('/attendance', admin.getAttendance);
router.post('/attendance/edit', admin.editAttendance);

router.get('/reports', admin.getReports);
router.get('/reports/daily', exp.dailyReport);
router.get('/reports/monthly', exp.monthlyReport);

module.exports = router;
