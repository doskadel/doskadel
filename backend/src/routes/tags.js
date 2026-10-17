const express = require('express');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const ctrl = require('../controllers/tagController');

const router = express.Router();
router.use(auth);
router.use(workspaceContext);

router.get('/', ctrl.listTags);
router.post('/', ctrl.createTag);
router.put('/:id', ctrl.updateTag);
router.delete('/:id', ctrl.deleteTag);
router.post('/:id/merge', ctrl.mergeTag);

module.exports = router;
