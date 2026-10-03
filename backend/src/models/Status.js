const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    required: true,
    default: '#9ca3af',
    match: /^#[0-9a-fA-F]{6}$/
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isFinal: {
    type: Boolean,
    default: false,
    required: true
  },
  // Системный ключ для дефолтных статусов (pending/in_progress/done/cancelled).
  // null — кастомный статус. Не зависит от названия (переименование не ломает логику).
  key: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

statusSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('Status', statusSchema);