const EntityLink = require('../models/EntityLink');
const Task = require('../models/Task');
const Article = require('../models/Article');
const { canByMembership } = require('../utils/can');

const MAX_LINKS = 50;

const modelFor = (type) => (type === 'task' ? Task : Article);

/** Существует ли сущность в workspace (не удалённая). */
async function entityExists(type, id, workspaceId) {
  if (type === 'task') return !!(await Task.findOne({ _id: id, workspaceId }).select('_id').lean());
  if (type === 'article') return !!(await Article.findOne({ _id: id, workspaceId, deletedAt: null }).select('_id').lean());
  return false;
}

/** Канонический порядок: a < b по (type,id). */
function canonical(fromType, fromId, toType, toId) {
  const aKey = fromType + ':' + String(fromId);
  const bKey = toType + ':' + String(toId);
  return aKey < bKey
    ? { aType: fromType, aId: fromId, bType: toType, bId: toId }
    : { aType: toType, aId: toId, bType: fromType, bId: fromId };
}

// POST /api/links { fromType, fromId, toType, toId }
const createLink = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { fromType, fromId, toType, toId } = req.body;
    if (!['task', 'article'].includes(fromType) || !['task', 'article'].includes(toType)) {
      return res.status(400).json({ success: false, message: 'Некорректный тип' });
    }
    if (!fromId || !toId) return res.status(400).json({ success: false, message: 'Некорректная связь' });
    if (fromType === toType && String(fromId) === String(toId)) return res.status(400).json({ success: false, message: 'Нельзя связать сущность с собой' });

    const [okFrom, okTo] = await Promise.all([
      entityExists(fromType, fromId, req.workspaceId),
      entityExists(toType, toId, req.workspaceId),
    ]);
    if (!okFrom || !okTo) return res.status(404).json({ success: false, message: 'Сущность не найдена' });

    // Лимит связей на сущность
    const cnt = await EntityLink.countDocuments({
      workspaceId: req.workspaceId,
      $or: [
        { aType: fromType, aId: fromId },
        { bType: fromType, bId: fromId },
      ],
    });
    if (cnt >= MAX_LINKS) return res.status(400).json({ success: false, message: `Не больше ${MAX_LINKS} связей` });

    const pair = canonical(fromType, fromId, toType, toId);
    try {
      const link = await EntityLink.create({ workspaceId: req.workspaceId, ...pair, createdBy: req.user._id });
      return res.status(201).json({ success: true, link });
    } catch (e) {
      if (e?.code === 11000) return res.status(409).json({ success: false, message: 'Связь уже существует' });
      throw e;
    }
  } catch (e) {
    console.error('createLink error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/links/:id
const deleteLink = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const r = await EntityLink.deleteOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('deleteLink error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/links?type=task&id=... — связи сущности с минимальными полями
const listLinks = async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!['task', 'article'].includes(type) || !id) return res.status(400).json({ success: false, message: 'type и id обязательны' });
    const links = await EntityLink.find({
      workspaceId: req.workspaceId,
      $or: [
        { aType: type, aId: id },
        { bType: type, bId: id },
      ],
    }).lean();

    // Для каждой связи достаём «другую» сущность с проверкой deletedAt
    const out = [];
    for (const l of links) {
      const otherType = l.aType === type && String(l.aId) === String(id) ? l.bType : l.aType;
      const otherId = l.aType === type && String(l.aId) === String(id) ? l.bId : l.aId;
      const Model = modelFor(otherType);
      const q = otherType === 'article'
        ? { _id: otherId, workspaceId: req.workspaceId, deletedAt: null }
        : { _id: otherId, workspaceId: req.workspaceId };
      const ent = await Model.findOne(q).select('_id title statusId priority deletedAt').lean();
      if (!ent) continue;
      let statusName = null;
      if (ent.statusId) {
        const Status = require('../models/Status');
        const st = await Status.findById(ent.statusId).select('name').lean();
        statusName = st?.name || null;
      }
      out.push({
        linkId: l._id,
        type: otherType,
        id: ent._id,
        title: ent.title,
        statusId: ent.statusId || null,
        statusName,
        priority: ent.priority ?? null,
      });
    }
    res.json({ success: true, links: out });
  } catch (e) {
    console.error('listLinks error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createLink, deleteLink, listLinks };
