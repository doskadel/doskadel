const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

let isConfigured = false;

if (VAPID_PUBLIC && VAPID_PRIVATE && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  isConfigured = true;
  console.log('[WEBPUSH] VAPID configured');
} else {
  console.warn('[WEBPUSH] VAPID keys missing — push disabled');
}

/**
 * Отправляет пуш на одну подписку.
 * Если endpoint протух (404/410) — удаляет подписку из БД.
 */
const sendToSubscription = async (subscriptionDoc, payload) => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscriptionDoc.endpoint,
        keys: subscriptionDoc.keys
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (error) {
    // 404 / 410 — подписка больше не действительна
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log(`[WEBPUSH] Removing stale subscription ${subscriptionDoc._id}`);
      await PushSubscription.deleteOne({ _id: subscriptionDoc._id });
      return { ok: false, removed: true, reason: 'stale' };
    }
    console.error('[WEBPUSH] Send error:', error.statusCode, error.message);
    return { ok: false, reason: error.message };
  }
};

/**
 * Отправляет пуш всем устройствам пользователя.
 */
const sendToUser = async (userId, payload) => {
  if (!isConfigured) {
    return { sent: 0, failed: 0 };
  }

  const subs = await PushSubscription.find({ userId });
  if (subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const res = await sendToSubscription(sub, payload);
    if (res.ok) sent++;
    else failed++;
  }

  return { sent, failed };
};

module.exports = {
  sendToUser,
  sendToSubscription,
  isConfigured: () => isConfigured
};