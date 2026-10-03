const express = require('express');
const auth = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');
const router = express.Router();

router.get('/dashboard', auth, settingsController.getDashboard);
router.put('/dashboard', auth, settingsController.putDashboard);

module.exports = router;
