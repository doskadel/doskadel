const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Article = require('../models/Article');
const router = express.Router();

// Поиск задач и статей
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Поиск задач
    const tasks = await Task.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).sort({ updatedAt: -1 });

    // Поиск статей
    const articles = await Article.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
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
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;