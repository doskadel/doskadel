const Task = require('../models/Task');
const Status = require('../models/Status');

// Создание задачи
const createTask = async (req, res) => {
  try {
    let { statusId } = req.body;

    if (!statusId) {
      const firstStatus = await Status.findOne({ userId: req.user._id })
        .sort({ order: 1 });
      if (!firstStatus) {
        return res.status(400).json({
          success: false,
          message: 'У вас нет статусов. Создайте хотя бы один.'
        });
      }
      statusId = firstStatus._id;
    }

    const lastTask = await Task.findOne({
      userId: req.user._id,
      statusId
    }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = new Task({
      ...req.body,
      statusId,
      order,
      userId: req.user._id
    });

    await task.save();

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Получение задач с фильтрами и сортировкой
const getTasks = async (req, res) => {
  try {
    const { q, priority, statusId, statusIds, dateFrom, dateTo, sort } = req.query;

    const filter = { userId: req.user._id };

    // Поиск по title + description
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: regex },
        { description: regex }
      ];
    }

    // Фильтр по приоритету (1,2,3)
    if (priority) {
      const priorities = String(priority)
        .split(',')
        .map((p) => parseInt(p, 10))
        .filter((p) => p >= 1 && p <= 3);

      if (priorities.length > 0) {
        filter.priority = { $in: priorities };
      }
    }

    // Фильтр по нескольким статусам
    if (statusIds) {
      const ids = String(statusIds).split(',').filter(Boolean);
      if (ids.length > 0) {
        filter.statusId = { $in: ids };
      }
    } else if (statusId) {
      filter.statusId = statusId;
    }

    // Фильтр по дате создания
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // Сортировка
    let sortObj = { order: 1, createdAt: -1 };
    switch (sort) {
      case 'createdAt_desc':
        sortObj = { createdAt: -1 };
        break;
      case 'createdAt_asc':
        sortObj = { createdAt: 1 };
        break;
      case 'priority_desc':
        sortObj = { priority: -1, createdAt: -1 };
        break;
      case 'priority_asc':
        sortObj = { priority: 1, createdAt: -1 };
        break;
      case 'title_asc':
        sortObj = { title: 1 };
        break;
      case 'title_desc':
        sortObj = { title: -1 };
        break;
      case 'order_asc':
      default:
        sortObj = { order: 1, createdAt: -1 };
        break;
    }

    const tasks = await Task.find(filter).sort(sortObj);

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Получение задачи по ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Обновление задачи
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Удаление задачи
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Переупорядочивание задач
const reorderTasks = async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        message: 'Tasks must be an array'
      });
    }

    for (const item of tasks) {
      await Task.updateOne(
        { _id: item.id, userId: req.user._id },
        { statusId: item.statusId, order: item.order }
      );
    }

    res.json({
      success: true,
      message: 'Tasks reordered'
    });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks
};