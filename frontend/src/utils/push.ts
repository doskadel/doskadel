import api from './api';

/**
 * Преобразует VAPID-public-key (base64url) в Uint8Array,
 * который ожидает PushManager.subscribe.
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

/**
 * Регистрирует push-подписку и отправляет её на бэкенд.
 * Возвращает true, если всё ок.
 */
export const subscribeUser = async (): Promise<{ ok: boolean; message?: string }> => {
  if (!isPushSupported()) {
    return { ok: false, message: 'Push-уведомления не поддерживаются в этом браузере' };
  }

  // 1. Разрешение
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'Разрешение на уведомления не выдано' };
  }

  // 2. Регистрация SW
  const registration = await navigator.serviceWorker.ready;

  // 3. VAPID public key с бэкенда
  let publicKey: string;
  try {
    const res = await api.get('/api/push/vapid-public-key');
    publicKey = res.data.publicKey;
    if (!publicKey) throw new Error('Empty public key');
  } catch (err: any) {
    console.error('[PUSH] Failed to get VAPID key:', err);
    return { ok: false, message: 'Не удалось получить VAPID-ключ с сервера' };
  }

  // 4. Подписка
  let subscription: PushSubscription;
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      subscription = existing;
    } else {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
  } catch (err: any) {
    console.error('[PUSH] Subscribe error:', err);
    return { ok: false, message: 'Не удалось подписаться на push: ' + err.message };
  }

  // 5. Отправка на бэкенд
  try {
    const subJson = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      userAgent: navigator.userAgent,
    });
  } catch (err: any) {
    console.error('[PUSH] Failed to send subscription to server:', err);
    return { ok: false, message: 'Не удалось сохранить подписку на сервере' };
  }

  return { ok: true };
};

/**
 * Отписывается от push на этом устройстве.
 */
export const unsubscribeUser = async (): Promise<{ ok: boolean; message?: string }> => {
  if (!isPushSupported()) {
    return { ok: false, message: 'Push-уведомления не поддерживаются' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { ok: true, message: 'Подписки и так нет' };
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    try {
      await api.delete('/api/push/unsubscribe', { data: { endpoint } });
    } catch (err) {
      // Если сервер вернул 404 — не критично, подписки там уже нет
      console.warn('[PUSH] Server unsubscribe warning:', err);
    }

    return { ok: true };
  } catch (err: any) {
    console.error('[PUSH] Unsubscribe error:', err);
    return { ok: false, message: err.message };
  }
};

/**
 * Проверяет, есть ли активная подписка в браузере.
 */
export const isSubscribed = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

/**
 * Тестовый пуш на текущее устройство.
 */
export const sendTestPush = async (): Promise<{ ok: boolean; message?: string }> => {
  try {
    const res = await api.post('/api/push/test', {
      title: 'WorkList',
      body: 'Тестовое уведомление',
      url: '/',
    });
    if (res.data.sent > 0) {
      return { ok: true };
    }
    return { ok: false, message: 'Подписок не найдено на сервере. Включите уведомления.' };
  } catch (err: any) {
    console.error('[PUSH] Test error:', err);
    return { ok: false, message: err.response?.data?.message || 'Ошибка отправки' };
  }
};