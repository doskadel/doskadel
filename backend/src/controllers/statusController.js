const Status = require('../models/Status');
const Task = require('../models/Task');

// Получение всех статусов пользователя
const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({ workspaceId: req.workspaceId })
      .sort({ order: 1 });

    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('Get statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Создание статуса
const createStatus = async (req, res) => {
  try {
    const { name, color, isFinal } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const lastStatus = await Status.findOne({ workspaceId: req.workspaceId })
      .sort({ order: -1 });
    const order = lastStatus ? lastStatus.order + 1 : 0;

    const status = new Status({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      createdBy: req.user._id,
      name: name.trim(),
      color: color || '#9ca3af',
      order,
      isFinal: !!isFinal
    });

    await status.save();

    res.status(201).json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Обновление статуса (name, color, order, isFinal)
const updateStatus = async (req, res) => {
  try {
    const { name, color, order, isFinal } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (color !== undefined) update.color = color;
    if (order !== undefined) update.order = order;
    if (isFinal !== undefined) update.isFinal = !!isFinal;

    const status = await Status.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      update,
      { new: true, runValidators: true }
    );

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Переупорядочивание статусов
const reorderStatuses = async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Order must be an array'
      });
    }

    for (const item of order) {
      await Status.updateOne(
        { _id: item.id, workspaceId: req.workspaceId },
        { order: item.order }
      );
    }

    const statuses = await Status.find({ workspaceId: req.workspaceId })
      .sort({ order: 1 });

    res.json({
      success: true,
      statuses
    });
  } catch (error) {
    console.error('Reorder statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Удаление статуса
const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    const tasksCount = await Task.countDocuments({
      statusId: status._id,
      workspaceId: req.workspaceId
    });

    if (tasksCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Нельзя удалить: есть задачи в этом статусе (${tasksCount})`
      });
    }

    await Status.deleteOne({ _id: status._id });

    res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getStatuses,
  createStatus,
  updateStatus,
  reorderStatuses,
  deleteStatus
};