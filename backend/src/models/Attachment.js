const mongoose = require('mongoose');

/**
 * Вложение статьи/задачи. Файл живёт в MinIO (key), метаданные — здесь.
 * Двухфазная загрузка (ревью Клода 2026-10-17):
 * pending (создана запись) -> загрузка в S3 -> ready (объект подтверждён head).
 * deletedAt — soft delete (как Article), GC-скрипт чистит бакет.
 */
const attachmentSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  // Для вложений у несохранённой сущности ownerType/ownerId = null (pending, привязка при создании).
  ownerType: {
    type: String,
    enum: ['article', 'task', null],
    default: null,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  key: {
    type: String,
    required: true,
    // ws/<workspaceId>/<uuid>.<ext>
  },
  filename: { type: String, required: true },
  mime: { type: String, required: true },
  size: { type: Number, required: true, min: 0 },
  sha256: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'ready'],
    default: 'pending',
    index: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

attachmentSchema.index({ ownerType: 1, ownerId: 1, deletedAt: 1 });
attachmentSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
