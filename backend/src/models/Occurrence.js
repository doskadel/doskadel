const mongoose = require('mongoose');

const occurrenceSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // Ключ вхождения: исходная дата по правилу (в локальной зоне задачи). Не меняется при переносе.
  originalDate: {
    type: Date,
    required: true,
    index: true
  },
  dueAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'skipped', 'missed'],
    default: 'pending',
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  // Флаги: какие пуши уже отправлены по этому вхождению
  notificationsSent: {
    dayBefore: { type: Date, default: null },
    beforeDue: { type: Date, default: null },
    atDue: { type: Date, default: null },
    overdue: { type: Date, default: null }
  }
}, {
  timestamps: true
});

occurrenceSchema.index({ workspaceId: 1, status: 1, dueAt: 1 });
occurrenceSchema.index({ taskId: 1, dueAt: -1 });
occurrenceSchema.index({ taskId: 1, status: 1 });
// Ключ вхождения: одно вхождение на дату правила
occurrenceSchema.index({ taskId: 1, originalDate: 1 }, { unique: true });

module.exports = mongoose.model('Occurrence', occurrenceSchema);