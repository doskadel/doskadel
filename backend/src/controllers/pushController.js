const PushSubscription = require('../models/PushSubscription');
const { sendToUser, isConfigured } = require('../utils/webPush');

// GET /api/push/vapid-public-key
const getVapidPublicKey = (req, res) => {
  if (!isConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Push not configured on server'
    });
  }
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
};

// POST /api/push/subscribe
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription: endpoint and keys required'
      });
    }

    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: userAgent || req.headers['user-agent'] || ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      subscription: { _id: sub._id, endpoint: sub.endpoint }
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/push/unsubscribe
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint required' });
    }
    const result = await PushSubscription.deleteOne({
      userId: req.user._id,
      endpoint
    });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/push/subscriptions
const listSubscriptions = async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.user._id })
      .select('_id endpoint userAgent createdAt');
    res.json({ success: true, subscriptions: subs });
  } catch (error) {
    console.error('List subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/push/test
const sendTest = async (req, res) => {
  try {
    const {
      title = 'DoskaDel',
      body = 'Тестовое уведомление',
      url = '/'
    } = req.body || {};

    const result = await sendToUser(req.user._id, {
      title,
      body,
      icon: '/logo192.png',
      data: { url }
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  listSubscriptions,
  sendTest
};