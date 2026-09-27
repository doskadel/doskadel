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

const dueDateValidation = body('dueDate')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === null || value === '') return true;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
      throw new Error('dueDate must be a valid ISO 8601 UTC date');
    }
    if (isNaN(Date.parse(value))) {
      throw new Error('dueDate is not a valid date');
    }
    return true;
  });

router.post('/', [priorityValidation, dueDateValidation], taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/reorder', taskController.reorderTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', [priorityValidation, dueDateValidation], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;