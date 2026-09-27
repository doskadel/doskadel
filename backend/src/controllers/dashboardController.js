const Task = require('../models/Task');
const Status = require('../models/Status');
const DiaryEntry = require('../models/DiaryEntry');

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

    // Общие счётчики
    const totalTasks = await Task.countDocuments({ userId });
    const totalDiary = await DiaryEntry.countDocuments({ userId });

    // Последние 5 задач по updatedAt
    const recentTasks = await Task.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('_id title statusId priority updatedAt');

    // Последние 5 записей дневника по createdAt
    const recentDiary = await DiaryEntry.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title createdAt');

    res.json({
      success: true,
      dashboard: {
        statusCounts,
        totalTasks,
        totalDiary,
        recentTasks,
        recentDiary
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