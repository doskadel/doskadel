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
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Получение всех записей дневника пользователя
const getDiaryEntries = async (req, res) => {
  try {
    const diaryEntries = await DiaryEntry.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      diaryEntries
    });
  } catch (error) {
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