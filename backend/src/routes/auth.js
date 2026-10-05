const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const router = express.Router();

// P1: строгий лимит на смену пароля (защита от брутфорса текущего пароля)
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 50 : 5,
  message: { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Регистрация
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.register);

// Вход
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// Обновление access-токена
router.post('/refresh', authController.refresh);

// Выход (отзыв refresh-токена)
router.post('/logout', authController.logout);

// P1: смена пароля, список сессий, выйти везде (требуют access-токен)
router.post('/change-password', auth, changePasswordLimiter, authController.changePassword);
router.get('/sessions', auth, authController.listSessions);
router.post('/logout-all', auth, authController.logoutAll);

module.exports = router;