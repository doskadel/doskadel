const mongoose = require('mongoose');
const Occurrence = require('../models/Occurrence');
const Task = require('../models/Task');

// GET /api/occurrences/pending — только наступившие (dueAt <= now)
const getPending = async (req, res) => {
  try {
    const occurrences = await Occurrence.find({
      userId: req.user._id,
      status: 'pending',
      dueAt: { $lte: new Date() }
    }).sort({ dueAt: 1 }).lean();

    res.json({
      success: true,
      occurrences
    });
  } catch (error) {
    console.error('Get pending occurrences error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
      userId: req.user._id
    }).select('_id');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const filter = { taskId, userId: req.user._id };
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
      userId: req.user._id
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
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const invalidCount = ids.length - validIds.length;

    const result = await Occurrence.updateMany(
      {
        _id: { $in: validIds },
        userId: req.user._id,
        status: 'pending'
      },
      {
        $set: { status: 'done', confirmedAt: new Date() }
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
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const invalidCount = ids.length - validIds.length;

    const result = await Occurrence.updateMany(
      {
        _id: { $in: validIds },
        userId: req.user._id,
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
  getPending,
  getByTask,
  getById,
  confirmBatch,
  unconfirmBatch
};