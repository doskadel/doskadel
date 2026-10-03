const Article = require('../models/Article');
const escapeRegex = require('../utils/escapeRegex');
const { canByMembership } = require('../utils/can');

// Создание статьи
const createArticle = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'create')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { title, content } = req.body;
    const article = new Article({
      title, content,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      createdBy: req.user._id
    });

    await article.save();

    res.status(201).json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Получение статей с фильтрами
const getArticles = async (req, res) => {
  try {
    const { q, dateFrom, dateTo, sort } = req.query;

    const filter = { workspaceId: req.workspaceId };

    // Поиск по title + content
    if (q && q.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
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

    // Collation для корректной сортировки по алфавиту
    const isTitleSort = sort === 'title_asc' || sort === 'title_desc';
    const query = Article.find(filter).sort(sortObj).lean();
    if (isTitleSort) {
      query.collation({ locale: 'ru', strength: 2 });
    }

    const articles = await query;

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Получение статьи по ID
const getArticleById = async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Обновление статьи
const updateArticle = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const updateData = {};
    ['title', 'content'].forEach((k) => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });
    const article = await Article.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Удаление статьи
const deleteArticle = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'delete')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const article = await Article.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle
};