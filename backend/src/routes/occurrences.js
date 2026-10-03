const express = require('express');
const auth = require('../middleware/auth');
const occurrenceController = require('../controllers/occurrenceController');
const router = express.Router();

router.use(auth);

router.get('/by-task/:taskId', occurrenceController.getByTask);
router.get('/:id', occurrenceController.getById);

router.put('/confirm', occurrenceController.confirmBatch);
router.put('/unconfirm', occurrenceController.unconfirmBatch);

module.exports = router;