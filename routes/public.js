const express = require('express');
const router  = express.Router();
const pub     = require('../controllers/publicController');

router.get('/attendance/:token', pub.getParentView);

module.exports = router;
