const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const router = express.Router();

router.use(auth);

const priorityValidation = body('priority')
  .optional()
  .isInt({ min: 1, max: 3 })
  .withMessage('Priority must be between 1 and 3');

router.post('/', [priorityValidation], taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/reorder', taskController.reorderTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', [priorityValidation], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;