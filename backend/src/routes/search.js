const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const DiaryEntry = require('../models/DiaryEntry');
const router = express.Router();

// Поиск задач и записей дневника
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
    });

    // Поиск записей дневника
    const diaryEntries = await DiaryEntry.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      results: {
        tasks,
        diaryEntries
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