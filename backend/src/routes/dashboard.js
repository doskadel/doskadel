const express = require('express');
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

router.use(auth);

router.get('/', dashboardController.getDashboard);

module.exports = router;