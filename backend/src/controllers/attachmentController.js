const crypto = require('crypto');
const path = require('path');
const FileType = require('file-type');
const Attachment = require('../models/Attachment');
const Article = require('../models/Article');
const Task = require('../models/Task');
const storage = require('../utils/storage');
const { canByMembership } = require('../utils/can');

const FILE_MAX_BYTES = parseInt(process.env.FILE_MAX_BYTES || String(25 * 1024 * 1024), 10);
const WORKSPACE_QUOTA = parseInt(process.env.FILE_WORKSPACE_QUOTA || String(1024 * 1024 * 1024), 10);

// Разрешённые типы по сигнатуре. Инлайн-показ — только безопасные картинки.
const IMAGE_INLINE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const ALLOWED = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
]);

const Comment = require('../models/Comment');

/** Резолвит владельца для прав: для comment — через его родителя (task/article). */
const getOwner = async (ownerType, ownerId, workspaceId) => {
  if (ownerType === 'article') {
    return Article.findOne({ _id: ownerId, workspaceId, deletedAt: null });
  }
  if (ownerType === 'task') {
    return Task.findOne({ _id: ownerId, workspaceId });
  }
  if (ownerType === 'comment') {
    const c = await Comment.findOne({ _id: ownerId, workspaceId, deletedAt: null }).lean();
    if (!c) return null;
    return getOwner(c.ownerType, c.ownerId, workspaceId);
  }
  return null;
};

/** Безопасное имя для Content-Disposition (RFC 5987 + ascii fallback). */
const contentDisposition = (filename, inline) => {
  const safeAscii = String(filename).replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
  const encoded = encodeURIComponent(filename);
  const disp = inline ? 'inline' : 'attachment';
  return `${disp}; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
};

/** Размер всех живых файлов workspace (для квоты). */
const usedBytes = async (workspaceId) => {
  const agg = await Attachment.aggregate([
    { $match: { workspaceId, deletedAt: null, status: 'ready' } },
    { $group: { _id: null, total: { $sum: '$size' } } },
  ]);
  return agg[0]?.total || 0;
};

// POST /api/attachments (multipart: file, поля ownerType, ownerId)
const uploadAttachment = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { ownerType, ownerId } = req.body;
    // Вложение к несохранённой сущности: ownerType/ownerId пусты -> pending.
    const hasOwner = ownerType && ownerId;
    if (hasOwner) {
      if (!['article', 'task', 'comment'].includes(ownerType)) {
        return res.status(400).json({ success: false, message: 'Invalid ownerType' });
      }
      const owner = await getOwner(ownerType, ownerId, req.workspaceId);
      if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    if (req.file.size > FILE_MAX_BYTES) {
      return res.status(413).json({ success: false, message: 'Файл больше лимита' });
    }

    // Определяем MIME по сигнатуре (не доверяем клиенту), fallback по расширению для текстовых.
    const detected = await FileType.fromBuffer(req.file.buffer);
    const origExt = (path.extname(req.file.originalname || '').replace('.', '') || '').toLowerCase();
    const EXT_MIME = { txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json' };
    let mime = detected?.mime;
    let ext = detected?.ext;
    if (!mime && EXT_MIME[origExt]) {
      mime = EXT_MIME[origExt];
      ext = origExt;
    }
    if (!mime) mime = 'application/octet-stream';
    if (!ext) ext = origExt || 'bin';
    if (!ALLOWED.has(mime)) {
      return res.status(415).json({ success: false, message: 'Тип файла не разрешён' });
    }

    // Квота workspace.
    const used = await usedBytes(req.workspaceId);
    if (used + req.file.size > WORKSPACE_QUOTA) {
      return res.status(413).json({ success: false, message: 'Превышена квота хранилища workspace' });
    }

    const key = `ws/${req.workspaceId}/${crypto.randomUUID()}.${ext}`;
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const originalName = path.basename(req.file.originalname || 'file').slice(0, 200);

    // pending -> upload -> ready
    const att = await Attachment.create({
      workspaceId: req.workspaceId,
      ownerType: hasOwner ? ownerType : null,
      ownerId: hasOwner ? ownerId : null,
      key,
      filename: originalName,
      mime,
      size: req.file.size,
      sha256,
      status: 'pending',
      uploadedBy: req.user._id,
    });

    try {
      await storage.upload(key, req.file.buffer, mime);
      const h = await storage.head(key);
      if (!h.exists) throw new Error('upload not confirmed');
      att.status = 'ready';
      await att.save();
    } catch (e) {
      // откат: удалить запись и объект (если загрузился)
      await Attachment.deleteOne({ _id: att._id });
      try { await storage.remove(key); } catch (_) {}
      throw e;
    }

    res.status(201).json({ success: true, attachment: att });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/attachments?ownerType=&ownerId=
const listAttachments = async (req, res) => {
  try {
    const { ownerType, ownerId } = req.query;
    if (!['article', 'task', 'comment'].includes(ownerType)) {
      return res.status(400).json({ success: false, message: 'Invalid ownerType' });
    }
    const owner = await getOwner(ownerType, ownerId, req.workspaceId);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    const items = await Attachment.find({
      workspaceId: req.workspaceId, ownerType, ownerId, deletedAt: null, status: 'ready',
    }).sort({ createdAt: 1 }).lean();
    // Не отдаём key наружу — только id и метаданные.
    const list = items.map((a) => ({
      _id: a._id, filename: a.filename, mime: a.mime, size: a.size, createdAt: a.createdAt,
    }));
    res.json({ success: true, attachments: list });
  } catch (error) {
    console.error('List attachments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/attachments/:id/raw — стрим файла
const rawAttachment = async (req, res) => {
  try {
    const att = await Attachment.findOne({ _id: req.params.id, workspaceId: req.workspaceId, deletedAt: null, status: 'ready' });
    if (!att) return res.status(404).json({ success: false, message: 'Not found' });
    const obj = await storage.getStream(att.key);
    if (!obj) return res.status(404).json({ success: false, message: 'Not found' });
    const inline = IMAGE_INLINE.has(att.mime);
    res.setHeader('Content-Type', att.mime);
    if (att.size) res.setHeader('Content-Length', String(att.size));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Disposition', contentDisposition(att.filename, inline));
    res.setHeader('ETag', `"${att.sha256 || att._id}"`);
    obj.stream.on('error', () => { try { res.destroy(); } catch (_) {} });
    obj.stream.pipe(res);
  } catch (error) {
    console.error('Raw attachment error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/attachments/:id — soft delete + удаление объекта
const deleteAttachment = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'delete')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const att = await Attachment.findOne({ _id: req.params.id, workspaceId: req.workspaceId, deletedAt: null });
    if (!att) return res.status(404).json({ success: false, message: 'Not found' });
    att.deletedAt = new Date();
    await att.save();
    try { await storage.remove(att.key); } catch (e) { console.error('S3 remove failed:', e?.message || e); }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/attachments/config — лимиты и разрешённые типы для клиента.
const getConfig = (req, res) => {
  res.json({
    success: true,
    maxFileBytes: FILE_MAX_BYTES,
    workspaceQuotaBytes: WORKSPACE_QUOTA,
    allowedMime: Array.from(ALLOWED),
    inlineMime: Array.from(IMAGE_INLINE),
  });
};

// POST /api/attachments/attach — привязка pending-вложений к созданной сущности.
// body: { ownerType, ownerId, ids: [attachmentId...] }
const attachToOwner = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { ownerType, ownerId, ids } = req.body;
    if (!['article', 'task'].includes(ownerType)) {
      return res.status(400).json({ success: false, message: 'Invalid ownerType' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids required' });
    }
    const owner = await getOwner(ownerType, ownerId, req.workspaceId);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    // Привязываем только свои pending-вложения из этого workspace.
    const result = await Attachment.updateMany(
      {
        _id: { $in: ids },
        workspaceId: req.workspaceId,
        uploadedBy: req.user._id,
        deletedAt: null,
        $or: [{ ownerId: null }, { ownerId: { $exists: false } }],
      },
      { $set: { ownerType, ownerId } }
    );
    res.json({ success: true, attached: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Attach owner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { uploadAttachment, listAttachments, rawAttachment, deleteAttachment, getConfig, attachToOwner };
