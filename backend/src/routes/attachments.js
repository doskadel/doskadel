const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const workspaceContext = require('../middleware/workspace');
const ctrl = require('../controllers/attachmentController');

const router = express.Router();

const FILE_MAX_BYTES = parseInt(process.env.FILE_MAX_BYTES || String(25 * 1024 * 1024), 10);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: FILE_MAX_BYTES } });

router.use(auth);
router.use(workspaceContext);

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Файл больше лимита' });
    }
    if (err) return res.status(400).json({ success: false, message: 'Ошибка загрузки' });
    next();
  });
}, ctrl.uploadAttachment);

router.get('/config', ctrl.getConfig);
router.post('/attach', ctrl.attachToOwner);
router.get('/', ctrl.listAttachments);
router.get('/:id/raw', ctrl.rawAttachment);
router.delete('/:id', ctrl.deleteAttachment);

module.exports = router;
