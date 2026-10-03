/** Контакты и версия приложения — в одном месте. */
export const SUPPORT_EMAIL = 'doskadel.info@gmail.com';
/** Версия (обновлять при релизе; соответствует frontend/package.json version). */
export const APP_VERSION = '1.0.0';
/** Краткое описание приложения. */
export const APP_TAGLINE = 'Задачи, планы и база знаний в одном месте.';

/** mailto-ссылка с закодированной темой и телом (контекст подставляется автоматически). */
export function buildMailto(subject: string, bodyLines: string[] = []): string {
  const body = [
    ...bodyLines,
    '',
    '---',
    `Версия: ${APP_VERSION}`,
    `Экран: ${typeof window !== 'undefined' ? window.location.pathname : ''}`,
    `Браузер: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
