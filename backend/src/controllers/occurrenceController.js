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

// PUT /api/occurrences/confirm  { ids: [...] }
const confirmBatch = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const invalidCount = ids.length - validIds.length;

    const result = await Occurrence.updateMany(
      {
        _id: { $in: validIds },
        workspaceId: req.workspaceId,
        status: 'pending'
      },
      {
        $set: { status: 'done', confirmedAt: new Date(), completedBy: req.user._id }
      }
    );

    res.json({
      success: true,
      updated: result.modifiedCount,
      failed: invalidCount + (validIds.length - result.modifiedCount),
      ids: validIds
    });
  } catch (error) {
    console.error('Confirm batch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/occurrences/unconfirm  { ids: [...] }
const unconfirmBatch = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const invalidCount = ids.length - validIds.length;

    const result = await Occurrence.updateMany(
      {
        _id: { $in: validIds },
        workspaceId: req.workspaceId,
        status: 'done'
      },
      {
        $set: { status: 'pending', confirmedAt: null }
      }
    );

    res.json({
      success: true,
      updated: result.modifiedCount,
      failed: invalidCount + (validIds.length - result.modifiedCount),
      ids: validIds
    });
  } catch (error) {
    console.error('Unconfirm batch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getByTask,
  getById,
  confirmBatch,
  unconfirmBatch
};