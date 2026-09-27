const DiaryEntry = require('../models/DiaryEntry');

// Создание записи в дневнике
const createDiaryEntry = async (req, res) => {
  try {
    const diaryEntry = new DiaryEntry({
      ...req.body,
      userId: req.user._id
    });
    
    await diaryEntry.save();
    
    res.status(201).json({
      success: true,
      diaryEntry
    });
  } catch (error) {
    console.error('Create diary entry error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Получение записей дневника с фильтрами
const getDiaryEntries = async (req, res) => {
  try {
    const { q, dateFrom, dateTo, sort } = req.query;

    const filter = { userId: req.user._id };

    // Поиск по title + content
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: regex },
        { content: regex }
      ];
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
    let sortObj = { createdAt: -1 };
    switch (sort) {
      case 'createdAt_asc':
        sortObj = { createdAt: 1 };
        break;
      case 'title_asc':
        sortObj = { title: 1 };
        break;
      case 'title_desc':
        sortObj = { title: -1 };
        break;
      case 'createdAt_desc':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const diaryEntries = await DiaryEntry.find(filter).sort(sortObj);
    
    res.json({
      success: true,
      diaryEntries
    });
  } catch (error) {
    console.error('Get diary entries error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Получение записи дневника по ID
const getDiaryEntryById = async (req, res) => {
  try {
    const diaryEntry = await DiaryEntry.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!diaryEntry) {
      return res.status(404).json({ 
        success: false,
        message: 'Diary entry not found' 
      });
    }
    
    res.json({
      success: true,
      diaryEntry
    });
  } catch (error) {
    console.error('Get diary entry error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Обновление записи дневника
const updateDiaryEntry = async (req, res) => {
  try {
    const diaryEntry = await DiaryEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!diaryEntry) {
      return res.status(404).json({ 
        success: false,
        message: 'Diary entry not found' 
      });
    }
    
    res.json({
      success: true,
      diaryEntry
    });
  } catch (error) {
    console.error('Update diary entry error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Удаление записи дневника
const deleteDiaryEntry = async (req, res) => {
  try {
    const diaryEntry = await DiaryEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!diaryEntry) {
      return res.status(404).json({ 
        success: false,
        message: 'Diary entry not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete diary entry error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

module.exports = {
  createDiaryEntry,
  getDiaryEntries,
  getDiaryEntryById,
  updateDiaryEntry,
  deleteDiaryEntry
};