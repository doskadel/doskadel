const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Status = require('../models/Status');
const Workspace = require('../models/Workspace');
const Membership = require('../models/Membership');
const RefreshToken = require('../models/RefreshToken');
const DEFAULT_STATUSES = require('../utils/defaultStatuses');
const { validationResult } = require('express-validator');
const { JWT_SECRET } = require('../config');

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;
const ABSOLUTE_MAX_DAYS = 90;
const GRACE_SECONDS = 20;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'doskadel_refresh';

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TTL });
};

const issueRefreshToken = async (userId, family, familyCreatedAt) => {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, family, expiresAt, familyCreatedAt: familyCreatedAt || new Date() });
  return token;
};

const setRefreshCookie = (res, token, remember = true) => {
  const opts = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/auth/refresh',
  };
  // «Помни меня»: persistent cookie (30д). Иначе — session cookie.
  if (remember) opts.maxAge = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, token, opts);
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

    // Личное пространство + членство(owner) — фундамент workspace
    const workspace = await Workspace.create({
      name: 'Личное',
      isPersonal: true,
      createdBy: user._id
    });
    await Membership.create({ userId: user._id, workspaceId: workspace._id, role: 'owner' });

    const statuses = DEFAULT_STATUSES.map(s => ({
      ...s,
      userId: user._id,
      workspaceId: workspace._id,
      createdBy: user._id
    }));
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

    const { email, password, remember } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const family = crypto.randomUUID();
    const refreshToken = await issueRefreshToken(user._id, family);
    setRefreshCookie(res, refreshToken, remember !== false);

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
    // Grace: недавно ротированный токен (гонка вкладок) не отзывает семью
    if (stored.used) {
      const ageMs = stored.usedAt ? Date.now() - new Date(stored.usedAt).getTime() : Infinity;
      if (ageMs < GRACE_SECONDS * 1000) {
        // в пределах grace — выдаём новый токен той же семьи, не отзываем
        const accessToken = generateAccessToken(stored.userId);
        const newRefresh = await issueRefreshToken(stored.userId, stored.family, stored.familyCreatedAt);
        setRefreshCookie(res, newRefresh);
        return res.json({ success: true, token: accessToken });
      }
      // реальный reuse после grace -> отзыв семьи
      await RefreshToken.deleteMany({ family: stored.family });
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Token reuse detected' });
    }
    // Абсолютный максимум: семья старше ABSOLUTE_MAX_DAYS — отказ
    const famStart = stored.familyCreatedAt ? new Date(stored.familyCreatedAt).getTime() : new Date(stored.createdAt).getTime();
    if (Date.now() - famStart > ABSOLUTE_MAX_DAYS * 24 * 60 * 60 * 1000) {
      await RefreshToken.deleteMany({ family: stored.family });
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired (absolute max)' });
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
    stored.usedAt = new Date();
    await stored.save();
    const accessToken = generateAccessToken(user._id);
    const newRefresh = await issueRefreshToken(user._id, stored.family, stored.familyCreatedAt);
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

// Смена пароля (P1): старый+новый, >=10, отзыв всех семей кроме текущей
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 10) {
      return res.status(400).json({ success: false, message: 'Новый пароль: минимум 10 символов' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!(await user.comparePassword(oldPassword || ''))) {
      return res.status(400).json({ success: false, message: 'Неверный текущий пароль' });
    }
    user.password = newPassword;
    await user.save();
    // отзыв всех семей кроме текущей
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    const cur = token ? await RefreshToken.findOne({ token }).select('family').lean() : null;
    if (cur) await RefreshToken.deleteMany({ userId: user._id, family: { $ne: cur.family } });
    else await RefreshToken.deleteMany({ userId: user._id });
    res.json({ success: true });
  } catch (e) {
    console.error('changePassword error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Список активных сессий (по семьям)
const listSessions = async (req, res) => {
  try {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    const cur = token ? await RefreshToken.findOne({ token }).select('family').lean() : null;
    const fams = await RefreshToken.aggregate([
      { $match: { userId: req.user._id, used: false } },
      { $group: { _id: '$family', createdAt: { $min: '$createdAt' }, expiresAt: { $max: '$expiresAt' } } },
      { $sort: { createdAt: -1 } },
    ]);
    res.json({ success: true, sessions: fams.map((f) => ({ id: f._id, createdAt: f.createdAt, expiresAt: f.expiresAt, current: cur ? f._id === cur.family : false })) });
  } catch (e) {
    console.error('listSessions error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Выйти везде (все семьи)
const logoutAll = async (req, res) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user._id });
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (e) {
    console.error('logoutAll error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout, changePassword, listSessions, logoutAll };
