const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
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
    if (!['daily', 'weekly', 'monthly'].includes(value.freq)) {
      throw new Error('recurrence.freq must be daily, weekly, or monthly');
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time || '')) {
      throw new Error('recurrence.time must be HH:mm');
    }
    const { isValidTz } = require('../utils/tz');
    if (!isValidTz(value.tz)) {
      throw new Error('recurrence.tz must be a valid IANA timezone');
    }
    if (value.interval !== undefined && (!Number.isInteger(value.interval) || value.interval < 1)) {
      throw new Error('recurrence.interval must be >= 1');
    }
    if (value.freq === 'weekly') {
      if (!Array.isArray(value.byWeekday) || value.byWeekday.length === 0 || value.byWeekday.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
        throw new Error('recurrence.byWeekday must be an array of 0-6');
      }
    }
    if (value.freq === 'monthly') {
      if (!Number.isInteger(value.byMonthDay) || value.byMonthDay < 1 || value.byMonthDay > 31) {
        throw new Error('recurrence.byMonthDay must be 1-31');
      }
    }
    return true;
  });

router.post('/', [priorityValidation, dueDateValidation, recurrenceValidation, validate], taskController.createTask);
router.get('/calendar-marks', taskController.getCalendarMarks);
router.get('/', taskController.getTasks);
router.put('/reorder', taskController.reorderTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', [priorityValidation, dueDateValidation, recurrenceValidation, validate], taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;