const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Status = require('../models/Status');
const RefreshToken = require('../models/RefreshToken');
const DEFAULT_STATUSES = require('../utils/defaultStatuses');
const { validationResult } = require('express-validator');

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'doskadel_refresh';

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'doskadel_secret', { expiresIn: ACCESS_TTL });
};

const issueRefreshToken = async (userId, family) => {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, family, expiresAt });
  return token;
};

const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/api/auth/refresh' });
};

// Дешёвая CSRF-защита: Origin должен совпадать с хостом (кроме dev).
const originOk = (req) => {
  const origin = req.get('origin');
  if (!origin) return true; // same-origin запросы без Origin
  if (!IS_PROD) return true;
  const host = req.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar || null
});

// Регистрация
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const statuses = DEFAULT_STATUSES.map(s => ({ ...s, userId: user._id }));
    await Status.insertMany(statuses);

    const accessToken = generateAccessToken(user._id);
    const family = crypto.randomUUID();
    const refreshToken = await issueRefreshToken(user._id, family);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      token: accessToken,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Вход
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const family = crypto.randomUUID();
    const refreshToken = await issueRefreshToken(user._id, family);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      token: accessToken,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Обновление access по refresh-cookie (ротация + reuse-detection)
const refresh = async (req, res) => {
  try {
    if (!originOk(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden origin' });
    }
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    const stored = await RefreshToken.findOne({ token });
    if (!stored) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    // REUSE-DETECTION: повторно использованный токен -> отзыв всей семьи
    if (stored.used) {
      await RefreshToken.deleteMany({ family: stored.family });
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Token reuse detected' });
    }
    if (stored.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: stored._id });
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Ротация: помечаем старый использованным, выдаём новый в той же семье
    stored.used = true;
    await stored.save();
    const accessToken = generateAccessToken(user._id);
    const newRefresh = await issueRefreshToken(user._id, stored.family);
    setRefreshCookie(res, newRefresh);

    res.json({
      success: true,
      token: accessToken,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Выход (отзыв refresh-семьи)
const logout = async (req, res) => {
  try {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    if (token) {
      const stored = await RefreshToken.findOne({ token });
      if (stored) await RefreshToken.deleteMany({ family: stored.family });
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout };
