export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
  time: string; // HH:mm в зоне tz (локальное для пользователя)
  byWeekday?: number[]; // 0=вс..6=сб, для weekly
  byMonthDay?: number; // 1-31, для monthly
  startDate?: string | null; // ISO, начало серии
  until?: string | null; // ISO
  count?: number | null;
  tz: string; // IANA
}

export const WEEKDAYS_RU: Array<{ value: number; label: string; short: string }> = [
  { value: 1, label: 'Понедельник', short: 'Пн' },
  { value: 2, label: 'Вторник', short: 'Вт' },
  { value: 3, label: 'Среда', short: 'Ср' },
  { value: 4, label: 'Четверг', short: 'Чт' },
  { value: 5, label: 'Пятница', short: 'Пт' },
  { value: 6, label: 'Суббота', short: 'Сб' },
  { value: 0, label: 'Воскресенье', short: 'Вс' },
];

export const RECURRENCE_FREQ_OPTIONS: Array<{ value: RecurrenceFreq; label: string }> = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
];

/** Зона браузера (IANA) с фолбэком на UTC. */
export const getBrowserTz = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const formatRecurrence = (r?: Recurrence | null): string => {
  if (!r || !r.freq) return '';
  const time = r.time || '';
  if (r.freq === 'daily') return `Каждый день, ${time}`;
  if (r.freq === 'weekly') {
    const days = (r.byWeekday || []).map((d) => WEEKDAYS_RU.find((w) => w.value === d)?.short || '').filter(Boolean);
    return `По ${days.join(', ')}, ${time}`;
  }
  if (r.freq === 'monthly') return `${r.byMonthDay ?? 1}-го числа, ${time}`;
  return '';
};

export const formatRecurrenceShort = (r?: Recurrence | null): string => {
  if (!r || !r.freq) return '';
  if (r.freq === 'daily') return 'Ежедневно';
  if (r.freq === 'weekly') {
    const days = (r.byWeekday || []).map((d) => WEEKDAYS_RU.find((w) => w.value === d)?.short || '').filter(Boolean);
    return days.length ? `По ${days.join(', ').toLowerCase()}` : 'Еженедельно';
  }
  if (r.freq === 'monthly') return `${r.byMonthDay ?? 1}-го`;
  return '';
};

/** Значение по умолчанию (time — локальное, tz из браузера). */
export const getDefaultRecurrence = (freq: RecurrenceFreq): Recurrence => {
  const base = { freq, interval: 1, time: '09:00', tz: getBrowserTz(), startDate: new Date().toISOString(), until: null, count: null };
  if (freq === 'weekly') return { ...base, byWeekday: [1] };
  if (freq === 'monthly') return { ...base, byMonthDay: 1 };
  return base;
};

export const isRecurrenceValid = (r?: Recurrence | null): boolean => {
  if (!r || !r.freq) return false;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time || '')) return false;
  if (!r.tz) return false;
  if (r.freq === 'weekly' && (!Array.isArray(r.byWeekday) || r.byWeekday.length === 0)) return false;
  if (r.freq === 'monthly' && (r.byMonthDay === undefined || r.byMonthDay < 1 || r.byMonthDay > 31)) return false;
  return true;
};
