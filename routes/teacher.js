const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const teacher = require('../controllers/teacherController');

router.use(protect);

router.get('/dashboard', teacher.getDashboard);
router.get('/attendance', teacher.getMarkAttendance);
router.post('/attendance', teacher.postMarkAttendance);
router.get('/records', teacher.getViewAttendance);

module.exports = router;
