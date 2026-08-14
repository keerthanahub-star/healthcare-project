const express = require('express');
const router = express.Router();
const { getDashboard, markComplete, pauseResume, updateConfig } = require('../controllers/doctorController');
const { auth, requireRole } = require('../middleware/auth');

router.get('/dashboard', auth, requireRole('doctor'), getDashboard);
router.post('/complete', auth, requireRole('doctor'), markComplete);
router.post('/pause-resume', auth, requireRole('doctor'), pauseResume);
router.put('/config', auth, requireRole('doctor'), updateConfig);

module.exports = router;

