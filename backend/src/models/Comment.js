const mongoose = require('mongoose');

/**
 * Комментарий к задаче/статье (ревью Клода 2026-10-17).
 * Глубина 2 уровня: parentId только у корневого; ответ на ответ -> parentId корня + replyToUserId.
 * contentJson — источник правды (TipTap), content — производный MD.
 */
const commentSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  ownerType: { type: String, enum: ['task', 'article'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  replyToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  contentJson: { type: mongoose.Schema.Types.Mixed, default: null },
  format: { type: String, enum: ['md', 'json'], default: 'md' },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

commentSchema.index({ workspaceId: 1, ownerType: 1, ownerId: 1, createdAt: 1 });
commentSchema.index({ workspaceId: 1, parentId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
