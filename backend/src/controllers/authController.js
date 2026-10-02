const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Status = require('../models/Status');
const RefreshToken = require('../models/RefreshToken');
const DEFAULT_STATUSES = require('../utils/defaultStatuses');
const { validationResult } = require('express-validator');

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'doskadel_secret', { expiresIn: ACCESS_TTL });
};

const issueRefreshToken = async (userId) => {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, expiresAt });
  return token;
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
    const refreshToken = await issueRefreshToken(user._id);

    res.status(201).json({
      success: true,
      token: accessToken,
      refreshToken,
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
    const refreshToken = await issueRefreshToken(user._id);

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Обновление access по refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Ротация: старый refresh удаляем, выдаём новый
    await RefreshToken.deleteOne({ _id: stored._id });
    const accessToken = generateAccessToken(user._id);
    const newRefresh = await issueRefreshToken(user._id);

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefresh,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Выход (отзыв refresh)
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout };
