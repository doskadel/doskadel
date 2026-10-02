/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'doskadel-sw-v1';

// Установка — сразу активируемся (не ждём reload)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============================================================
// PUSH — пришёл пуш от сервера
// ============================================================
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'DoskaDel', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'DoskaDel';
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo192.png',
    badge: '/favicon-96x96.png',
    tag: data.tag || undefined,
    requireInteraction: !!data.requireInteraction,
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ============================================================
// NOTIFICATIONCLICK — пользователь кликнул по уведомлению
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';
  const occurrenceId = data.occurrenceId;
  const action = event.action;

  // Если нажата кнопка «Подтвердить» — отправим PUT /api/occurrences/confirm
  if (action === 'confirm' && occurrenceId) {
    event.waitUntil(confirmOccurrence(occurrenceId, targetUrl));
    return;
  }

  // Иначе — просто открываем/фокусируем окно с targetUrl
  event.waitUntil(openOrFocus(targetUrl));
});

// ============================================================
// Вспомогательные функции
// ============================================================

async function openOrFocus(url) {
  const fullUrl = new URL(url, self.location.origin).href;
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of allClients) {
    if (client.url === fullUrl && 'focus' in client) {
      return client.focus();
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(fullUrl);
  }
}

async function confirmOccurrence(occurrenceId, fallbackUrl) {
  try {
    // Токен хранится в localStorage основного окна — SW не имеет к нему прямого доступа.
    // Поэтому шлём сообщение всем открытым окнам — они отправят запрос с токеном.
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    if (allClients.length > 0) {
      for (const client of allClients) {
        client.postMessage({
          type: 'CONFIRM_OCCURRENCE',
          occurrenceId,
        });
      }
      // Фокусируем первое окно
      if (allClients[0].focus) {
        await allClients[0].focus();
      }
    } else {
      // Ни одного открытого окна — открываем fallbackUrl
      // (подтверждение придётся сделать вручную)
      await openOrFocus(fallbackUrl);
    }
  } catch (err) {
    console.error('[SW] confirmOccurrence error:', err);
    await openOrFocus(fallbackUrl);
  }
}

// ============================================================
// MESSAGE — сообщения от основного приложения
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});