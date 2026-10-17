const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  // Гибридное хранение (ADR 2026-10-16): contentJson — источник правды (JSON TipTap),
  // content — производный Markdown (для regex-поиска и старых клиентов).
  contentJson: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  format: {
    type: String,
    enum: ['md', 'json'],
    default: 'md'
  },
  schemaVersion: {
    type: Number,
    default: 1
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
  deletedAt: {
    type: Date,
    default: null
  },
  // Теги (Tag._id) и счётчик комментариев.
  tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Tag', default: [] },
  commentsCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

articleSchema.index({ workspaceId: 1, createdAt: -1 }); // список статей
articleSchema.index({ workspaceId: 1, title: 1 }); // фильтр по title (префиксный)
articleSchema.index({ workspaceId: 1, tagIds: 1 }); // теги

module.exports = mongoose.model('Article', articleSchema);