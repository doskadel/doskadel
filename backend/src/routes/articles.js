const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const articleController = require('../controllers/articleController');
const { validateDocJson } = require('../utils/description');
const router = express.Router();

router.use(auth);
router.use(workspaceContext);

const articleValidation = [
  body('title').optional().isString().isLength({ max: 200 }).withMessage('title too long'),
  body('content').optional({ nullable: true }).isString().isLength({ max: 500000 }).withMessage('content too long'),
  body('contentJson').optional({ nullable: true }).custom((value) => {
    const err = validateDocJson(value, { field: 'contentJson' });
    if (err) throw new Error(err);
    return true;
  }),
];

router.post('/', [...articleValidation, validate], articleController.createArticle);
router.get('/', articleController.getArticles);
router.get('/:id', articleController.getArticleById);
router.put('/:id', [...articleValidation, validate], articleController.updateArticle);
router.delete('/:id', articleController.deleteArticle);

module.exports = router;