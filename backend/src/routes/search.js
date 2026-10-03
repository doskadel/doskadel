const express = require('express');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const Task = require('../models/Task');
const Article = require('../models/Article');
const escapeRegex = require('../utils/escapeRegex');
const router = express.Router();

// Поиск задач и статей
router.get('/', auth, workspaceContext, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const safe = escapeRegex(q);

    // Поиск задач
    const tasks = await Task.find({
      workspaceId: req.workspaceId,
      $or: [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } }
      ]
    }).sort({ updatedAt: -1 });

    // Поиск статей
    const articles = await Article.find({
      workspaceId: req.workspaceId,
      $or: [
        { title: { $regex: safe, $options: 'i' } },
        { content: { $regex: safe, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      results: {
        tasks,
        tasksTotal: tasks.length,
        articles,
        articlesTotal: articles.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;