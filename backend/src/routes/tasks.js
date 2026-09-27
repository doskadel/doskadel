const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const router = express.Router();

// Все маршруты требуют аутентификации
router.use(auth);

// Валидация приоритета
const priorityValidation = body('priority')
  .optional()
  .isInt({ min: 1, max: 3 })
  .withMessage('Priority must be between 1 and 3');

// CRUD операции с задачами
router.post('/', [priorityValidation], taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', [priorityValidation], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;