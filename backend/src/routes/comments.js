const express = require('express');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const ctrl = require('../controllers/commentController');

const router = express.Router();
router.use(auth);
router.use(workspaceContext);

router.get('/', ctrl.listComments);
router.post('/', ctrl.createComment);
router.put('/:id', ctrl.updateComment);
router.delete('/:id', ctrl.deleteComment);

module.exports = router;
