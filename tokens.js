const express = require('express');
const router = express.Router();
const { generateToken, getMyToken, getQueueStatus } = require('../controllers/tokenController');
const { auth, requireRole } = require('../middleware/auth');

router.post('/generate', auth, requireRole('patient'), generateToken);
router.get('/my-token', auth, requireRole('patient'), getMyToken);
router.get('/queue-status', auth, getQueueStatus);

module.exports = router;

