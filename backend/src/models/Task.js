const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 3,
    default: 2,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  // Правило повторяемости (F1c). Нет recurrence.freq = разовая задача.
  recurrence: {
    freq: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    interval: { type: Number, min: 1, default: 1 },
    byWeekday: { type: [Number] },
    byMonthDay: { type: Number, min: 1, max: 31 },
    time: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    startDate: { type: Date, default: null },
    until: { type: Date, default: null },
    count: { type: Number, default: null },
    tz: { type: String, default: null }
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  // Флаги: какие пуши уже отправлены по этой задаче (для разовых)
  // null = не отправляли; Date = когда отправили
  notificationsSent: {
    dayBefore: { type: Date, default: null },
    beforeDue: { type: Date, default: null },
    atDue: { type: Date, default: null },
    overdue: { type: Date, default: null },
    dayBeforeAttempts: { type: Number, default: 0 },
    beforeDueAttempts: { type: Number, default: 0 },
    atDueAttempts: { type: Number, default: 0 },
    overdueAttempts: { type: Number, default: 0 }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // F1c split: общий id серии (у первой задачи = её _id) и ссылка на предыдущую часть
  seriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  prevTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  // Причина завершения (например, 'split') — чтобы отличать от выполненной
  closedReason: {
    type: String,
    default: null
  },
  // Фундамент workspace: добавляется миграцией; после бэкфилла — required+index
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  // Авторство (createdBy = бывший userId). Позже — updatedBy/assigneeId/deletedAt
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ workspaceId: 1, statusId: 1, order: 1 });
taskSchema.index({ workspaceId: 1, 'recurrence.freq': 1 });
taskSchema.index({ workspaceId: 1, dueDate: 1 }); // для выборки разовых с близким dueDate

module.exports = mongoose.model('Task', taskSchema);