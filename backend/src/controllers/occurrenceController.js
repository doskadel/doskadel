const mongoose = require('mongoose');
const Occurrence = require('../models/Occurrence');
const Task = require('../models/Task');
const { canByMembership } = require('../utils/can');

// GET /api/occurrences/by-task/:taskId?status=pending|done
const getByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid taskId' });
    }

    const task = await Task.findOne({
      _id: taskId,
      workspaceId: req.workspaceId
    }).select('_id');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const filter = { taskId, workspaceId: req.workspaceId };
    if (status === 'pending' || status === 'done') {
      filter.status = status;
    }

    const occurrences = await Occurrence.find(filter).sort({ dueAt: -1 }).lean();

    res.json({
      success: true,
      occurrences
    });
  } catch (error) {
    console.error('Get occurrences by task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/occurrences/history/:taskId — история серии (обе части по seriesId)
const getHistory = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid taskId' });
    }
    const task = await Task.findOne({ _id: taskId, workspaceId: req.workspaceId }).select('_id seriesId').lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const seriesId = task.seriesId || task._id;
    // все задачи серии
    const seriesTasks = await Task.find({ workspaceId: req.workspaceId, $or: [{ _id: seriesId }, { seriesId }] }).select('_id').lean();
    const ids = seriesTasks.map((t) => t._id);
    const occurrences = await Occurrence.find({ workspaceId: req.workspaceId, taskId: { $in: ids } })
      .select('taskId originalDate dueAt status completedAt')
      .sort({ originalDate: -1 })
      .lean();
    const done = occurrences.filter((o) => o.status === 'done').length;
    const skipped = occurrences.filter((o) => o.status === 'skipped').length;
    res.json({ success: true, occurrences, done, skipped, total: done + skipped });
  } catch (e) {
    console.error('Get history error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/occurrences/:id
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const occurrence = await Occurrence.findOne({
      _id: id,
      workspaceId: req.workspaceId
    }).lean();

    if (!occurrence) {
      return res.status(404).json({ success: false, message: 'Occurrence not found' });
    }

    res.json({ success: true, occurrence });
  } catch (error) {
    console.error('Get occurrence error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// confirm/unconfirm удалены (F1c): заменены на POST /api/occurrences/action (done/undo).

module.exports = {
  getByTask,
  getById,
  getHistory
};