const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Article = require('../models/Article');
const Attachment = require('../models/Attachment');
const { canByMembership } = require('../utils/can');
const { applyDescriptionFields, validateDocJson } = require('../utils/description');

const MAX_LEN = 50000;

async function getOwner(ownerType, ownerId, workspaceId) {
  if (ownerType === 'task') return Task.findOne({ _id: ownerId, workspaceId });
  if (ownerType === 'article') return Article.findOne({ _id: ownerId, workspaceId, deletedAt: null });
  return null;
}

async function incOwnerCount(ownerType, ownerId, workspaceId, delta) {
  const Model = ownerType === 'task' ? Task : Article;
  await Model.updateOne({ _id: ownerId, workspaceId }, { $inc: { commentsCount: delta } });
}

// GET /api/comments?ownerType=&ownerId=
const listComments = async (req, res) => {
  try {
    const { ownerType, ownerId } = req.query;
    if (!['task', 'article'].includes(ownerType) || !ownerId) return res.status(400).json({ success: false, message: 'ownerType и ownerId обязательны' });
    const owner = await getOwner(ownerType, ownerId, req.workspaceId);
    if (!owner) return res.status(404).json({ success: false, message: 'Сущность не найдена' });

    const comments = await Comment.find({ workspaceId: req.workspaceId, ownerType, ownerId, deletedAt: null }).sort({ createdAt: 1 }).populate('authorId', 'email avatar').lean();
    // Вложения комментариев: принадлежат owner, помечены commentId (Jira-style).
    const ids = comments.map((c) => c._id);
    const atts = await Attachment.find({ workspaceId: req.workspaceId, commentId: { $in: ids }, deletedAt: null, status: 'ready' }).lean();
    const attByComment = {};
    atts.forEach((a) => { (attByComment[String(a.commentId)] = attByComment[String(a.commentId)] || []).push({ _id: a._id, filename: a.filename, mime: a.mime, size: a.size }); });

    const out = comments.map((c) => ({
      _id: c._id,
      parentId: c.parentId,
      replyToUserId: c.replyToUserId,
      authorId: c.authorId?._id || c.authorId,
      authorEmail: c.authorId?.email || null,
      authorAvatar: c.authorId?.avatar || null,
      content: c.deletedAt ? '' : c.content,
      contentJson: c.deletedAt ? null : c.contentJson,
      format: c.format,
      editedAt: c.editedAt,
      deleted: !!c.deletedAt,
      createdAt: c.createdAt,
      attachments: attByComment[String(c._id)] || [],
    }));
    res.json({ success: true, comments: out });
  } catch (e) {
    console.error('listComments error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/comments { ownerType, ownerId, parentId?, replyToUserId?, contentJson?, content?, attachments?: [pendingIds] }
const createComment = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'read')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { ownerType, ownerId, parentId, replyToUserId } = req.body;
    if (!['task', 'article'].includes(ownerType) || !ownerId) return res.status(400).json({ success: false, message: 'ownerType и ownerId обязательны' });
    const owner = await getOwner(ownerType, ownerId, req.workspaceId);
    if (!owner) return res.status(404).json({ success: false, message: 'Сущность не найдена' });

    let rootParentId = null;
    if (parentId) {
      const parent = await Comment.findOne({ _id: parentId, workspaceId: req.workspaceId, ownerType, ownerId, deletedAt: null });
      if (!parent) return res.status(400).json({ success: false, message: 'Родительский комментарий не найден' });
      // Глубина 2: ответ на ответ -> привязываем к корню
      // Глубина: считаем цепочку родителей, максимум 3 уровня (корень=1).
      let depth = 1; let cur = parent;
      while (cur.parentId) { depth += 1; if (depth >= 3) break; cur = await Comment.findOne({ _id: cur.parentId, workspaceId: req.workspaceId }).select('parentId').lean(); if (!cur) break; }
      if (depth >= 3) return res.status(400).json({ success: false, message: 'Не больше 3 уровней комментариев' });
      rootParentId = parent._id;
    }

    const body = {};
    if (req.body.contentJson !== undefined) {
      const err = validateDocJson(req.body.contentJson, { field: 'contentJson' });
      if (err) return res.status(400).json({ success: false, message: err });
      body.contentJson = req.body.contentJson;
      body.format = 'json';
    }
    if (req.body.content !== undefined) {
      if (String(req.body.content).length > MAX_LEN) return res.status(413).json({ success: false, message: 'Комментарий слишком длинный' });
      body.content = req.body.content;
    }
    if (!body.content && !body.contentJson) return res.status(400).json({ success: false, message: 'Пустой комментарий' });

    const comment = await Comment.create({
      workspaceId: req.workspaceId,
      ownerType,
      ownerId,
      parentId: rootParentId,
      replyToUserId: replyToUserId || null,
      authorId: req.user._id,
      ...body,
    });

    // Jira-style: вложения комментария принадлежат owner (task/article), помечены commentId.
    if (Array.isArray(req.body.attachments) && req.body.attachments.length) {
      await Attachment.updateMany(
        { _id: { $in: req.body.attachments }, workspaceId: req.workspaceId, uploadedBy: req.user._id, deletedAt: null, $or: [{ ownerId: null }, { ownerId: { $exists: false } }] },
        { $set: { ownerType, ownerId, commentId: comment._id } }
      );
    }

    await incOwnerCount(ownerType, ownerId, req.workspaceId, 1);
    res.status(201).json({ success: true, comment });
  } catch (e) {
    console.error('createComment error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/comments/:id — только автор, ставит editedAt
const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, workspaceId: req.workspaceId, deletedAt: null });
    if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
    if (String(comment.authorId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Только автор может редактировать' });
    const body = {};
    if (req.body.contentJson !== undefined) {
      const err = validateDocJson(req.body.contentJson, { field: 'contentJson' });
      if (err) return res.status(400).json({ success: false, message: err });
      body.contentJson = req.body.contentJson; body.format = 'json';
    }
    if (req.body.content !== undefined) {
      if (String(req.body.content).length > MAX_LEN) return res.status(413).json({ success: false, message: 'Комментарий слишком длинный' });
      body.content = req.body.content;
    }
    body.editedAt = new Date();
    Object.assign(comment, body);
    await comment.save();
    res.json({ success: true, comment });
  } catch (e) {
    console.error('updateComment error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/comments/:id — автор или право delete; soft; если есть ответы — обнулить текст
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, workspaceId: req.workspaceId, deletedAt: null });
    if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
    const isAuthor = String(comment.authorId) === String(req.user._id);
    if (!isAuthor && !canByMembership(req.membership, 'delete')) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Собираем всё поддерево (родитель + все потомки любого уровня).
    const toDelete = [comment._id];
    let frontier = [comment._id];
    while (frontier.length) {
      const kids = await Comment.find({ workspaceId: req.workspaceId, parentId: { $in: frontier }, deletedAt: null }).select('_id').lean();
      const kidIds = kids.map((k) => k._id);
      if (!kidIds.length) break;
      toDelete.push(...kidIds);
      frontier = kidIds;
    }

    const now = new Date();
    await Comment.updateMany({ _id: { $in: toDelete }, workspaceId: req.workspaceId }, { $set: { deletedAt: now, content: '', contentJson: null } });
    await Attachment.updateMany({ workspaceId: req.workspaceId, commentId: { $in: toDelete }, deletedAt: null }, { $set: { deletedAt: now } });

    await incOwnerCount(comment.ownerType, comment.ownerId, req.workspaceId, -toDelete.length);
    res.json({ success: true });
  } catch (e) {
    console.error('deleteComment error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { listComments, createComment, updateComment, deleteComment };
