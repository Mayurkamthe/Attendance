const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.get('/logout', auth.logout);
router.get('/reset-password', auth.getResetPassword);
router.post('/reset-password', auth.postResetPassword);

module.exports = router;
