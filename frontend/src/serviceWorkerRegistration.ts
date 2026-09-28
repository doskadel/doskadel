/* eslint-disable no-console */

export const register = (): void => {
  if (process.env.NODE_ENV !== 'production' && process.env.REACT_APP_ENABLE_SW !== 'true') {
    // В dev режиме SW не нужен (кроме случаев, когда явно включено — для теста push)
    // Но чтобы push можно было проверить и локально, разрешаем через REACT_APP_ENABLE_SW=true
    console.log('[SW] Skipping service worker registration in development');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[SW] Registered', registration.scope);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[SW] New content is available; please refresh.');
              } else {
                console.log('[SW] Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
};

export const unregister = (): void => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
    })
    .catch((error) => {
      console.error('[SW] Unregister failed:', error);
    });
};