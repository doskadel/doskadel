const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const router = express.Router();

router.use(auth);

router.get('/me', userController.getMe);
router.put('/notification-settings', userController.updateNotificationSettings);
router.put('/avatar', userController.updateAvatar);

module.exports = router;