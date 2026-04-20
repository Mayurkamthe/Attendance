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
router.post('/teachers/:id/reset-password', admin.resetTeacherPassword);

router.get('/students', admin.getStudents);
router.post('/students', admin.createStudent);
// ⚠️ bulk-upload MUST stay above /:id routes to avoid 'bulk-upload' being treated as an ObjectId
router.post('/students/bulk-upload', upload.single('file'), admin.bulkUpload);
router.get('/students/:id/parent-link', admin.getParentLink);
router.post('/students/:id/update', admin.updateStudent);
router.post('/students/:id/delete', admin.deleteStudent);

router.get('/attendance', admin.getAttendance);
router.post('/attendance/edit', admin.editAttendance);

router.get('/subjects', admin.getSubjects);
router.post('/subjects', admin.createSubject);
router.post('/subjects/:id/update', admin.updateSubject);
router.post('/subjects/:id/delete', admin.deleteSubject);

router.get('/reports', admin.getReports);
router.get('/reports/daily', exp.dailyReport);
router.get('/reports/monthly', exp.monthlyReport);
router.get('/students/import-template', exp.bulkImportTemplate);

module.exports = router;
