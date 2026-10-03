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
    required: true,
    index: true
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
  dueAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'done'],
    default: 'pending',
    required: true
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

module.exports = mongoose.model('Occurrence', occurrenceSchema);