const Task = require('../models/Task');
const Status = require('../models/Status');
const Article = require('../models/Article');
const User = require('../models/User');
const { SINGLE } = require('../utils/taskKinds');
const { aggregateOccurrenceSummary } = require('../utils/taskDueSummary');

// Конец дня (23:59:59.999) через N календарных дней от сегодня (локальное время сервера).
const endOfDayPlus = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const statuses = await Status.find({ userId }).sort({ order: 1 }).lean();
    const statusCounts = await Promise.all(
      statuses.map(async (s) => {
        const count = await Task.countDocuments({ userId, statusId: s._id });
        return { statusId: s._id, name: s.name, color: s.color, count, key: s.key || null };
      })
    );

    const activeStatusIds = statuses.filter((s) => !s.isFinal).map((s) => s._id);
    const now = new Date();
    const user = await User.findById(userId).select('dashboardSettings');
    const upcomingDays = (user && user.dashboardSettings && user.dashboardSettings.upcomingDays) || 3;
    const blocksCfg = (user && user.dashboardSettings && user.dashboardSettings.blocks) || [];
    const limitOf = (id, def) => {
      const b = blocksCfg.find((x) => x.id === id);
      return b && b.config && b.config.limit ? b.config.limit : def;
    };
    const upcomingLimit = endOfDayPlus(upcomingDays);

    // ==== ПРОСРОЧЕНО ====
    // 1) Разовые задачи с dueDate < now
    const overdueSimpleTasks = await Task.find({
      userId,
      statusId: { $in: activeStatusIds },
      dueDate: { $ne: null, $lt: now },
      ...SINGLE
    }).select('_id title statusId priority dueDate').lean();

    // 2) Повторяющиеся: единая агрегация (R1) — дата + count за один проход.
    const overdueSummary = await aggregateOccurrenceSummary(userId, { $lt: now }, 'max');

    const overdueRecurringTaskIds = Array.from(overdueSummary.keys());
    const overdueRecurringTasks = await Task.find({
      _id: { $in: overdueRecurringTaskIds },
      userId,
      statusId: { $in: activeStatusIds }
    }).select('_id title statusId priority').lean();

    const overdueFromRecurring = overdueRecurringTasks.map((task) => {
      const s = overdueSummary.get(String(task._id));
      return {
        _id: task._id,
        title: task.title,
        statusId: task.statusId,
        priority: task.priority,
        dueDate: s.dateAt,
        occurrenceCount: s.count,
        isRecurring: true
      };
    });

    const overdueSimple = overdueSimpleTasks.map((t) => ({
      _id: t._id,
      title: t.title,
      statusId: t.statusId,
      priority: t.priority,
      dueDate: t.dueDate,
      occurrenceCount: 1,
      isRecurring: false
    }));

    const allOverdue = [...overdueSimple, ...overdueFromRecurring];

    // Счётчики для бейджа:
    // overdueTotalOccurrences — общее число просроченных вхождений (для «⚠️ Просрочено (N)»)
    // overdueDistinctTasks — число уникальных задач (для «Открыть все»)
    const overdueTotalOccurrences = allOverdue.reduce(
      (sum, t) => sum + (t.occurrenceCount || 1),
      0
    );
    const overdueDistinctTasks = allOverdue.length;

    // Сортируем: сначала самая свежая просрочка, потом остальные
    allOverdue.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    const overdueTasks = allOverdue.slice(0, limitOf('overdue', 5));

    // ==== БЛИЖАЙШИЕ ====
    // 1) Разовые задачи
    const upcomingSimpleTasks = await Task.find({
      userId,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: now, $lte: upcomingLimit },
      ...SINGLE
    }).select('_id title statusId priority dueDate').lean();

    // 2) Повторяющиеся: единая агрегация (R1) — дата + count за один проход.
    const upcomingSummary = await aggregateOccurrenceSummary(userId, { $gte: now, $lte: upcomingLimit }, 'min');

    const upcomingRecurringTaskIds = Array.from(upcomingSummary.keys());
    const upcomingRecurringTasks = await Task.find({
      _id: { $in: upcomingRecurringTaskIds },
      userId,
      statusId: { $in: activeStatusIds }
    }).select('_id title statusId priority').lean();

    const upcomingFromRecurring = upcomingRecurringTasks.map((task) => {
      const s = upcomingSummary.get(String(task._id));
      return {
        _id: task._id,
        title: task.title,
        statusId: task.statusId,
        priority: task.priority,
        dueDate: s.dateAt,
        occurrenceCount: s.count,
        isRecurring: true
      };
    });

    const upcomingSimple = upcomingSimpleTasks.map((t) => ({
      _id: t._id,
      title: t.title,
      statusId: t.statusId,
      priority: t.priority,
      dueDate: t.dueDate,
      occurrenceCount: 1,
      isRecurring: false
    }));

    const allUpcoming = [...upcomingSimple, ...upcomingFromRecurring];

    const upcomingTotalOccurrences = allUpcoming.reduce(
      (sum, t) => sum + (t.occurrenceCount || 1),
      0
    );

    // Сортируем: сначала ближайшее
    allUpcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const upcomingTasks = allUpcoming.slice(0, limitOf('upcoming', 5));

    // Общие счётчики
    const totalTasks = await Task.countDocuments({ userId });
    const totalArticles = await Article.countDocuments({ userId });

    const recentTasks = await Task.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('_id title statusId priority updatedAt');

    const recentArticles = await Article.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title createdAt');

    res.json({
      success: true,
      dashboard: {
        upcomingDays,
        statusCounts,
        totalTasks,
        totalArticles,
        recentTasks,
        recentArticles,

        overdueTasks,
        overdueCount: overdueTotalOccurrences,       // для бейджа
        overdueDistinctTasks,                        // для «Все →»

        upcomingTasks,
        upcomingCount: upcomingTotalOccurrences,     // для бейджа
        upcomingDistinctTasks: upcomingTasks.length  // для «Все →»
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard };