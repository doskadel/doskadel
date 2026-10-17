const express = require('express');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const ctrl = require('../controllers/linkController');

const router = express.Router();
router.use(auth);
router.use(workspaceContext);

router.get('/', ctrl.listLinks);
router.post('/', ctrl.createLink);
router.delete('/:id', ctrl.deleteLink);

module.exports = router;
