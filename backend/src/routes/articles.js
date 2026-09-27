const express = require('express');
const auth = require('../middleware/auth');
const articleController = require('../controllers/articleController');
const router = express.Router();

router.use(auth);

router.post('/', articleController.createArticle);
router.get('/', articleController.getArticles);
router.get('/:id', articleController.getArticleById);
router.put('/:id', articleController.updateArticle);
router.delete('/:id', articleController.deleteArticle);

module.exports = router;