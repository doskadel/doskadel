const express = require('express');
const auth = require('../middleware/auth');
const statusController = require('../controllers/statusController');
const router = express.Router();

// Все маршруты требуют аутентификации
router.use(auth);

router.get('/', statusController.getStatuses);
router.post('/', statusController.createStatus);
router.put('/reorder', statusController.reorderStatuses);
router.put('/:id', statusController.updateStatus);
router.delete('/:id', statusController.deleteStatus);

module.exports = router;