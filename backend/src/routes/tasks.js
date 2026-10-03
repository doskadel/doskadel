const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const taskController = require('../controllers/taskController');
const router = express.Router();

router.use(auth);
router.use(workspaceContext);

const priorityValidation = body('priority')
  .optional()
  .isInt({ min: 1, max: 3 })
  .withMessage('Priority must be between 1 and 3');

const dueDateValidation = body('dueDate')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === null || value === '') return true;
    if (isNaN(Date.parse(value))) throw new Error('dueDate is not a valid date');
    return true;
  });

const recurrenceValidation = body('recurrence')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === null) return true;
    if (typeof value !== 'object') throw new Error('recurrence must be an object');
    if (!['daily', 'weekly', 'monthly'].includes(value.type)) {
      throw new Error('recurrence.type must be daily, weekly, or monthly');
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time || '')) {
      throw new Error('recurrence.time must be HH:mm');
    }
    if (value.type === 'weekly') {
      if (!Number.isInteger(value.dayOfWeek) || value.dayOfWeek < 0 || value.dayOfWeek > 6) {
        throw new Error('recurrence.dayOfWeek must be 0-6');
      }
    }
    if (value.type === 'monthly') {
      if (!Number.isInteger(value.dayOfMonth) || value.dayOfMonth < 1 || value.dayOfMonth > 31) {
        throw new Error('recurrence.dayOfMonth must be 1-31');
      }
    }
    return true;
  });

router.post('/', [priorityValidation, dueDateValidation, recurrenceValidation], taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/reorder', taskController.reorderTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', [priorityValidation, dueDateValidation, recurrenceValidation], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;