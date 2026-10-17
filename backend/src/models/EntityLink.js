const mongoose = require('mongoose');

/**
 * Двунаправленная связь между сущностями (task<->article).
 * Канонический порядок (ревью Клода): (aType,aId) < (bType,bId), пара хранится один раз.
 * Индекс unique защищает от дубля A->B / B->A.
 */
const entityLinkSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  aType: { type: String, enum: ['task', 'article'], required: true },
  aId: { type: mongoose.Schema.Types.ObjectId, required: true },
  bType: { type: String, enum: ['task', 'article'], required: true },
  bId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

entityLinkSchema.index({ workspaceId: 1, aType: 1, aId: 1 });
entityLinkSchema.index({ workspaceId: 1, bType: 1, bId: 1 });
entityLinkSchema.index({ workspaceId: 1, aType: 1, aId: 1, bType: 1, bId: 1 }, { unique: true });

module.exports = mongoose.model('EntityLink', entityLinkSchema);
