const Task = require('../models/Task');
const Status = require('../models/Status');
const Article = require('../models/Article');

// Получение агрегированных данных для дашборда
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Счётчики по статусам
    const statuses = await Status.find({ userId }).sort({ order: 1 });

    const statusCounts = await Promise.all(
      statuses.map(async (s) => {
        const count = await Task.countDocuments({ userId, statusId: s._id });
        return {
          statusId: s._id,
          name: s.name,
          color: s.color,
          count
        };
      })
    );

    // Активные статусы (не финальные)
    const activeStatusIds = statuses
      .filter((s) => !s.isFinal)
      .map((s) => s._id);

    const now = new Date();
    const upcomingLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Просроченные: активные, dueDate < now, сортировка по dueDate asc
    const overdueFilter = {
      userId,
      statusId: { $in: activeStatusIds },
      dueDate: { $ne: null, $lt: now }
    };

    const overdueTasks = await Task.find(overdueFilter)
      .sort({ dueDate: 1 })
      .limit(5)
      .select('_id title statusId priority dueDate');

    const overdueCount = await Task.countDocuments(overdueFilter);

    // Ближайшие: активные, now <= dueDate <= now + 3 дня, сортировка по dueDate asc
    const upcomingFilter = {
      userId,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: now, $lte: upcomingLimit }
    };

    const upcomingTasks = await Task.find(upcomingFilter)
      .sort({ dueDate: 1 })
      .limit(5)
      .select('_id title statusId priority dueDate');

    const upcomingCount = await Task.countDocuments(upcomingFilter);

    // Общие счётчики
    const totalTasks = await Task.countDocuments({ userId });
    const totalArticles = await Article.countDocuments({ userId });

    // Последние 5 задач по updatedAt
    const recentTasks = await Task.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('_id title statusId priority updatedAt');

    // Последние 5 статей по createdAt
    const recentArticles = await Article.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title createdAt');

    res.json({
      success: true,
      dashboard: {
        statusCounts,
        totalTasks,
        totalArticles,
        recentTasks,
        recentArticles,
        overdueTasks,
        overdueCount,
        upcomingTasks,
        upcomingCount
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getDashboard
};