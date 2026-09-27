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

    // Определяем order — в конец своего статуса
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

// Получение всех задач пользователя
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
      .sort({ order: 1, createdAt: -1 });

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
    const { tasks } = req.body; // массив { id, statusId, order }

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