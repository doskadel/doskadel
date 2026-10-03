const User = require('../models/User');
const Status = require('../models/Status');
const DEFAULT_DASHBOARD = require('../utils/dashboardDefaults');

const KNOWN_BLOCKS = ['byStatus', 'overdue', 'upcoming', 'recentTasks', 'recentArticles'];

// Собираем настройки: если у пользователя их нет — дефолт (statusKeys -> statusIds по системному key).
async function resolveSettings(user) {
  let ds = user.dashboardSettings;
  const own = new Set((await Status.find({ userId: user._id }).select('_id')).map((s) => String(s._id)));
  const cleanConfig = (id, cfg) => {
    const c = cfg || {};
    if (id === 'byStatus') return { statusIds: (c.statusIds || []).filter((x) => own.has(String(x))) };
    if (id === 'recentTasks' || id === 'recentArticles' || id === 'overdue' || id === 'upcoming') {
      const lim = Math.min(20, Math.max(1, parseInt(c.limit, 10) || 5));
      return { limit: lim };
    }
    return {};
  };
  if (!ds || !ds.blocks || ds.blocks.length === 0) {
    // дефолт: статусы по системному key -> id
    const statuses = await Status.find({ userId: user._id });
    const byKey = {};
    statuses.forEach((s) => { if (s.key) byKey[s.key] = s._id; });
    const blocks = DEFAULT_DASHBOARD.blocks.map((b) => ({
      id: b.id,
      visible: b.visible,
      order: b.order,
      config: cleanConfig(b.id, { statusIds: b.statusKeys.map((k) => byKey[k]).filter(Boolean) }),
    }));
    return { upcomingDays: DEFAULT_DASHBOARD.upcomingDays, blocks };
  }
  const saved = ds.blocks.map((b) => ({
    id: b.id,
    visible: b.visible,
    order: b.order,
    config: cleanConfig(b.id, b.config || (b.statusIds ? { statusIds: b.statusIds } : {})),
  }));
  // Новые блоки (которых нет в сохранённых) — в конец, не ломая старых.
  const savedIds = new Set(saved.map((b) => b.id));
  let nextOrder = saved.reduce((m, b) => Math.max(m, b.order), -1) + 1;
  DEFAULT_DASHBOARD.blocks.forEach((d) => {
    if (!savedIds.has(d.id)) {
      saved.push({ id: d.id, visible: d.visible, order: nextOrder++, config: cleanConfig(d.id, {}) });
    }
  });
  return { upcomingDays: ds.upcomingDays || 3, blocks: saved };
}

// GET /api/settings/dashboard
const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const settings = await resolveSettings(user);
    res.json({ success: true, settings });
  } catch (e) {
    console.error('getDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/settings/dashboard
const putDashboard = async (req, res) => {
  try {
    const { upcomingDays, blocks } = req.body;
    const days = Math.min(30, Math.max(1, parseInt(upcomingDays, 10) || 3));
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ success: false, message: 'blocks must be array' });
    }
    const own = new Set((await Status.find({ userId: req.user._id }).select('_id')).map((s) => String(s._id)));
    const clean = blocks
      .filter((b) => b && KNOWN_BLOCKS.includes(b.id))
      .map((b, i) => {
        const cfg = b.config || {};
        let config = {};
        if (b.id === 'byStatus') {
          config = { statusIds: Array.isArray(cfg.statusIds) ? cfg.statusIds.filter((id) => own.has(String(id))) : [] };
        } else if (b.id === 'recentTasks' || b.id === 'recentArticles' || b.id === 'overdue' || b.id === 'upcoming') {
          config = { limit: Math.min(20, Math.max(1, parseInt(cfg.limit, 10) || 5)) };
        }
        return {
          id: b.id,
          visible: !!b.visible,
          order: typeof b.order === 'number' ? b.order : i,
          config,
        };
      });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { dashboardSettings: { upcomingDays: days, blocks: clean } },
      { new: true }
    );
    const settings = await resolveSettings(user);
    res.json({ success: true, settings });
  } catch (e) {
    console.error('putDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/settings/dashboard/reset — сброс настроек дашборда И статусов к дефолту.
// Блокер: если у кастомных статусов есть задачи — не сбрасываем.
const resetDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const statuses = await Status.find({ userId });
    const custom = statuses.filter((s) => !s.key);
    const customIds = custom.map((s) => s._id);
    if (customIds.length > 0) {
      const Task = require('../models/Task');
      const used = await Task.countDocuments({ userId, statusId: { $in: customIds } });
      if (used > 0) {
        return res.status(409).json({
          success: false,
          message: 'У созданных вами статусов есть задачи. Удалите или перенесите задачи, затем повторите.',
        });
      }
      await Status.deleteMany({ userId, _id: { $in: customIds } });
    }
    // Восстанавливаем недостающие дефолтные статусы (по key)
    const DEFAULT_STATUSES = require('../utils/defaultStatuses');
    const existingKeys = new Set((await Status.find({ userId })).map((s) => s.key).filter(Boolean));
    const toAdd = DEFAULT_STATUSES.filter((d) => !existingKeys.has(d.key)).map((d) => ({ ...d, userId }));
    if (toAdd.length > 0) await Status.insertMany(toAdd);
    // Сбрасываем настройки дашборда
    await User.findByIdAndUpdate(userId, { $unset: { dashboardSettings: 1 } });
    const user = await User.findById(userId);
    const settings = await resolveSettings(user);
    res.json({ success: true, settings });
  } catch (e) {
    console.error('resetDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, putDashboard, resetDashboard };
