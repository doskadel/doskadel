export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  type: RecurrenceType;
  time: string; // HH:mm (хранится в UTC)
  dayOfWeek?: number; // 0-6, для weekly
  dayOfMonth?: number; // 1-31, для monthly
}

export const WEEKDAYS_RU: Array<{ value: number; label: string; short: string }> = [
  { value: 0, label: 'Воскресенье', short: 'Вс' },
  { value: 1, label: 'Понедельник', short: 'Пн' },
  { value: 2, label: 'Вторник', short: 'Вт' },
  { value: 3, label: 'Среда', short: 'Ср' },
  { value: 4, label: 'Четверг', short: 'Чт' },
  { value: 5, label: 'Пятница', short: 'Пт' },
  { value: 6, label: 'Суббота', short: 'Сб' },
];

export const RECURRENCE_TYPE_OPTIONS: Array<{ value: RecurrenceType; label: string }> = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
];

export const TASK_TYPE_OPTIONS = [
  { value: 'single', label: 'Разовое' },
  { value: 'recurring', label: 'Повторяющееся' },
] as const;

export type TaskType = typeof TASK_TYPE_OPTIONS[number]['value'];

// ============================================================
// Конвертация времени: локальное ↔ UTC
// ============================================================

/**
 * Конвертирует локальное время (HH:mm) в UTC (HH:mm).
 *
 * Пример: если пользователь в UTC+3 ввёл "16:11", вернёт "13:11".
 *
 * Работает через Date — использует локальную зону браузера.
 */
export const localTimeToUtc = (localTime: string): string => {
  if (!localTime || !/^\d{2}:\d{2}$/.test(localTime)) return localTime;
  const [h, m] = localTime.split(':').map(Number);
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0
  );
  const utcH = String(localDate.getUTCHours()).padStart(2, '0');
  const utcM = String(localDate.getUTCMinutes()).padStart(2, '0');
  return `${utcH}:${utcM}`;
};

/**
 * Конвертирует UTC-время (HH:mm) в локальное (HH:mm).
 *
 * Пример: если сервер хранит "13:11", а браузер в UTC+3, вернёт "16:11".
 *
 * Работает через Date — использует локальную зону браузера.
 */
export const utcTimeToLocal = (utcTime: string): string => {
  if (!utcTime || !/^\d{2}:\d{2}$/.test(utcTime)) return utcTime;
  const [h, m] = utcTime.split(':').map(Number);
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    h,
    m,
    0,
    0
  ));
  const localH = String(utcDate.getHours()).padStart(2, '0');
  const localM = String(utcDate.getMinutes()).padStart(2, '0');
  return `${localH}:${localM}`;
};

// ============================================================
// Форматирование для отображения
// ============================================================

/**
 * Форматирует правило в читаемый текст. Время конвертирует из UTC в локальное.
 * "Каждый день, 16:11" (если хранится 13:11 UTC и браузер в UTC+3)
 */
export const formatRecurrence = (r?: Recurrence | null): string => {
  if (!r || !r.type) return '';
  const localTime = utcTimeToLocal(r.time || '');

  if (r.type === 'daily') {
    return `Каждый день, ${localTime}`;
  }
  if (r.type === 'weekly') {
    const dow = WEEKDAYS_RU.find((d) => d.value === (r.dayOfWeek ?? 1));
    return `Каждый ${(dow?.label || '').toLowerCase()}, ${localTime}`;
  }
  if (r.type === 'monthly') {
    return `${r.dayOfMonth ?? 1}-го числа, ${localTime}`;
  }
  return '';
};

/**
 * Короткое правило для бейджей. Время не показываем.
 */
export const formatRecurrenceShort = (r?: Recurrence | null): string => {
  if (!r || !r.type) return '';
  if (r.type === 'daily') return 'Ежедневно';
  if (r.type === 'weekly') {
    const dow = WEEKDAYS_RU.find((d) => d.value === (r.dayOfWeek ?? 1));
    return `По ${(dow?.short || '').toLowerCase()}`;
  }
  if (r.type === 'monthly') return `${r.dayOfMonth ?? 1}-го`;
  return '';
};

/** Значение по умолчанию для выбранного типа (время — локальное!) */
export const getDefaultRecurrence = (type: RecurrenceType): Recurrence => {
  const localTime = '09:00';
  const utcTime = localTimeToUtc(localTime);

  if (type === 'daily') return { type, time: utcTime };
  if (type === 'weekly') return { type, time: utcTime, dayOfWeek: 1 };
  if (type === 'monthly') return { type, time: utcTime, dayOfMonth: 1 };
  return { type: 'daily', time: utcTime };
};

/** Валидна ли форма recurrence */
export const isRecurrenceValid = (r?: Recurrence | null): boolean => {
  if (!r || !r.type) return false;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time || '')) return false;
  if (r.type === 'weekly') {
    if (r.dayOfWeek === undefined || r.dayOfWeek < 0 || r.dayOfWeek > 6) return false;
  }
  if (r.type === 'monthly') {
    if (r.dayOfMonth === undefined || r.dayOfMonth < 1 || r.dayOfMonth > 31) return false;
  }
  return true;
};