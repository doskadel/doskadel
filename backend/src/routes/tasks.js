const express = require('express');
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const router = express.Router();

// Все маршруты требуют аутентификации
router.use(auth);

// CRUD операции с задачами
router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;