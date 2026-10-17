const Tag = require('../models/Tag');
const Task = require('../models/Task');
const Article = require('../models/Article');
const { canByMembership } = require('../utils/can');

const MAX_TAGS = 10;
const MAX_NAME = 30;

const normName = (s) => String(s || '').trim().slice(0, MAX_NAME);

/** Проверка, что все tagIds принадлежат workspace. Возвращает false при нарушении. */
async function validateTagIds(tagIds, workspaceId) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return true;
  if (tagIds.length > MAX_TAGS) return false;
  const uniq = Array.from(new Set(tagIds.map(String)));
  const cnt = await Tag.countDocuments({ _id: { $in: uniq }, workspaceId });
  return cnt === uniq.length;
}

// GET /api/tags — список тегов workspace + счётчики использования
const listTags = async (req, res) => {
  try {
    const tags = await Tag.find({ workspaceId: req.workspaceId }).sort({ nameLower: 1 }).lean();
    // счётчики: задачи и статьи с тегом (не удалённые)
    const counts = await Promise.all(tags.map(async (t) => {
      const [tasks, articles] = await Promise.all([
        Task.countDocuments({ workspaceId: req.workspaceId, tagIds: t._id }),
        Article.countDocuments({ workspaceId: req.workspaceId, tagIds: t._id, deletedAt: null }),
      ]);
      return { _id: t._id, name: t.name, color: t.color, count: tasks + articles };
    }));
    res.json({ success: true, tags: counts });
  } catch (e) {
    console.error('listTags error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tags { name, color }
const createTag = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const name = normName(req.body.name);
    if (!name) return res.status(400).json({ success: false, message: 'Название тега обязательно' });
    const nameLower = name.toLowerCase();
    const exists = await Tag.findOne({ workspaceId: req.workspaceId, nameLower });
    if (exists) return res.status(409).json({ success: false, message: 'Тег уже существует', tag: exists });
    const color = typeof req.body.color === 'string' ? req.body.color.slice(0, 20) : null;
    const tag = await Tag.create({ workspaceId: req.workspaceId, name, nameLower, color, createdBy: req.user._id });
    res.status(201).json({ success: true, tag });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: 'Тег уже существует' });
    console.error('createTag error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/tags/:id { name?, color? }
const updateTag = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'manage')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const tag = await Tag.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!tag) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.name !== undefined) {
      const name = normName(req.body.name);
      if (!name) return res.status(400).json({ success: false, message: 'Название обязательно' });
      const nameLower = name.toLowerCase();
      if (nameLower !== tag.nameLower) {
        const dup = await Tag.findOne({ workspaceId: req.workspaceId, nameLower, _id: { $ne: tag._id } });
        if (dup) return res.status(409).json({ success: false, message: 'Тег с таким именем уже есть' });
      }
      tag.name = name;
      tag.nameLower = nameLower;
    }
    if (req.body.color !== undefined) tag.color = typeof req.body.color === 'string' ? req.body.color.slice(0, 20) : null;
    await tag.save();
    res.json({ success: true, tag });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: 'Тег с таким именем уже есть' });
    console.error('updateTag error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/tags/:id — hard delete + $pull из сущностей
const deleteTag = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'manage')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const tag = await Tag.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!tag) return res.status(404).json({ success: false, message: 'Not found' });
    await Promise.all([
      Task.updateMany({ workspaceId: req.workspaceId, tagIds: tag._id }, { $pull: { tagIds: tag._id } }),
      Article.updateMany({ workspaceId: req.workspaceId, tagIds: tag._id }, { $pull: { tagIds: tag._id } }),
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error('deleteTag error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tags/:id/merge { targetId } — слить :id в targetId
const mergeTag = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'manage')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const src = await Tag.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    const dst = await Tag.findOne({ _id: req.body.targetId, workspaceId: req.workspaceId });
    if (!src || !dst || String(src._id) === String(dst._id)) return res.status(400).json({ success: false, message: 'Некорректные теги' });
    await Promise.all([
      Task.updateMany({ workspaceId: req.workspaceId, tagIds: src._id }, { $addToSet: { tagIds: dst._id } }),
      Article.updateMany({ workspaceId: req.workspaceId, tagIds: src._id }, { $addToSet: { tagIds: dst._id } }),
    ]);
    await Promise.all([
      Task.updateMany({ workspaceId: req.workspaceId, tagIds: src._id }, { $pull: { tagIds: src._id } }),
      Article.updateMany({ workspaceId: req.workspaceId, tagIds: src._id }, { $pull: { tagIds: src._id } }),
    ]);
    await Tag.deleteOne({ _id: src._id, workspaceId: req.workspaceId });
    res.json({ success: true });
  } catch (e) {
    console.error('mergeTag error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { listTags, createTag, updateTag, deleteTag, mergeTag, validateTagIds, MAX_TAGS };
