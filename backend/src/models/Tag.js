const mongoose = require('mongoose');

/**
 * Тег workspace (ревью Клода 2026-10-17):
 * nameLower — уникальность без учёта регистра; color — hex; удаление hard + $pull из сущностей.
 */
const tagSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 30 },
  nameLower: { type: String, required: true },
  color: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

tagSchema.index({ workspaceId: 1, nameLower: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
