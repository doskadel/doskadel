const User = require('../models/User');
const Status = require('../models/Status');
const DEFAULT_DASHBOARD = require('../utils/dashboardDefaults');

const KNOWN_BLOCKS = ['byStatus', 'overdue', 'upcoming', 'recentTasks', 'recentArticles'];

// Собираем настройки: если у пользователя их нет — дефолт (statusKeys -> statusIds по системному key).
async function resolveSettings(user) {
  let ds = user.dashboardSettings;
  if (!ds || !ds.blocks || ds.blocks.length === 0) {
    // дефолт: подставляем id статусов по ключам
    const statuses = await Status.find({ userId: user._id });
    const byKey = {};
    statuses.forEach((s) => { if (s.key) byKey[s.key] = s._id; });
    const blocks = DEFAULT_DASHBOARD.blocks.map((b) => ({
      id: b.id,
      visible: b.visible,
      order: b.order,
      statusIds: b.statusKeys.map((k) => byKey[k]).filter(Boolean),
    }));
    return { upcomingDays: DEFAULT_DASHBOARD.upcomingDays, blocks };
  }
  // чистим statusIds от удалённых статусов
  const own = new Set((await Status.find({ userId: user._id }).select('_id')).map((s) => String(s._id)));
  const blocks = ds.blocks.map((b) => ({
    id: b.id,
    visible: b.visible,
    order: b.order,
    statusIds: (b.statusIds || []).filter((id) => own.has(String(id))),
  }));
  return { upcomingDays: ds.upcomingDays || 3, blocks };
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
      .map((b, i) => ({
        id: b.id,
        visible: !!b.visible,
        order: typeof b.order === 'number' ? b.order : i,
        statusIds: Array.isArray(b.statusIds) ? b.statusIds.filter((id) => own.has(String(id))) : [],
      }));
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

module.exports = { getDashboard, putDashboard };
