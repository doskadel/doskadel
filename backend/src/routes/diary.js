const express = require('express');
const auth = require('../middleware/auth');
const diaryController = require('../controllers/diaryController');
const router = express.Router();

// Все маршруты требуют аутентификации
router.use(auth);

// CRUD операции с записями дневника
router.post('/', diaryController.createDiaryEntry);
router.get('/', diaryController.getDiaryEntries);
router.get('/:id', diaryController.getDiaryEntryById);
router.put('/:id', diaryController.updateDiaryEntry);
router.delete('/:id', diaryController.deleteDiaryEntry);

module.exports = router;