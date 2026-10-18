/** Цвет неоновой подсветки: выбор пользователя (hex) -> CSS-переменные --neon-rgb/--neon-2-rgb. */
const KEY = 'doskadel_neon';

export const NEON_PRESETS: { name: string; hex: string }[] = [
  { name: 'Синий', hex: '#3b82f6' },
  { name: 'Бирюзовый', hex: '#06b6d4' },
  { name: 'Зелёный', hex: '#22c55e' },
  { name: 'Фиолетовый', hex: '#8b5cf6' },
  { name: 'Розовый', hex: '#ec4899' },
  { name: 'Оранжевый', hex: '#f97316' },
  { name: 'Красный', hex: '#ef4444' },
];

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lighten = ([r, g, b]: [number, number, number], amt: number): [number, number, number] => [
  Math.min(255, Math.round(r + (255 - r) * amt)),
  Math.min(255, Math.round(g + (255 - g) * amt)),
  Math.min(255, Math.round(b + (255 - b) * amt)),
];

export const getNeon = (): string => {
  try { return localStorage.getItem(KEY) || '#3b82f6'; } catch { return '#3b82f6'; }
};

/** Применить цвет неона (hex). Возвращает применённый hex. */
export const applyNeon = (hex: string): string => {
  const rgb = hexToRgb(hex) || [59, 130, 246];
  const rgb2 = lighten(rgb, 0.18);
  const root = document.documentElement;
  root.style.setProperty('--neon-rgb', rgb.join(' '));
  root.style.setProperty('--neon-2-rgb', rgb2.join(' '));
  // Подстраиваем primary-акцент (кнопки, ссылки, активные) под выбранный цвет.
  const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  root.style.setProperty('--color-primary', hex);
  // цвет primary-акцентов подстроим под неон (кнопки, ссылки, активные)
  root.style.setProperty('--neon-hex', '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''));
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
};

export const setNeon = (hex: string): void => {
  const applied = applyNeon(hex);
  try { localStorage.setItem(KEY, applied); } catch { /* ignore */ }
};

export const initNeon = (): void => { applyNeon(getNeon()); };
