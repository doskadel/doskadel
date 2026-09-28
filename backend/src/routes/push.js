const express = require('express');
const auth = require('../middleware/auth');
const pushController = require('../controllers/pushController');
const router = express.Router();

// VAPID-ключ доступен без авторизации? Нет — пусть тоже с auth.
router.get('/vapid-public-key', auth, pushController.getVapidPublicKey);
router.post('/subscribe', auth, pushController.subscribe);
router.delete('/unsubscribe', auth, pushController.unsubscribe);
router.get('/subscriptions', auth, pushController.listSubscriptions);
router.post('/test', auth, pushController.sendTest);

module.exports = router;