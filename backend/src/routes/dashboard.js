const express = require('express');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

router.use(auth);
router.use(workspaceContext);

router.get('/', dashboardController.getDashboard);

module.exports = router;