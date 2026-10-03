const express = require('express');
const auth = require('../middleware/auth');
const occurrenceController = require('../controllers/occurrenceController');
const occurrenceActionsController = require('../controllers/occurrenceActionsController');
const router = express.Router();

router.use(auth);
router.use(require('../middleware/workspace'));

router.post('/action', occurrenceActionsController.action);
router.get('/by-task/:taskId', occurrenceController.getByTask);
router.get('/:id', occurrenceController.getById);

router.put('/confirm', occurrenceController.confirmBatch);
router.put('/unconfirm', occurrenceController.unconfirmBatch);

module.exports = router;