/**
 * ISO-строка с UTC (например "2026-09-28T11:00:00.000Z") →
 * строка для <input type="datetime-local"> в локальном времени
 * (например "2026-09-28T14:00").
 */
export const toDateTimeLocalValue = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * ISO-строка с UTC → читаемое локальное представление.
 * Например "2026-09-28T11:00:00.000Z" → "28.09.2026, 14:00".
 */
export const formatDueDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Просрочено ли: dueDate < текущий момент.
 */
export const isOverdue = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
};

/** 'Ближайшее: завтра, 09:00' — относительный день + время. */
export const formatOccurrenceLabel = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  let day: string;
  if (diffDays === 0) day = 'сегодня';
  else if (diffDays === 1) day = 'завтра';
  else if (diffDays === -1) day = 'вчера';
  else if (diffDays > 1 && diffDays <= 6) day = d.toLocaleDateString('ru-RU', { weekday: 'long' });
  else day = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${day}, ${time}`;
};

export type DeadlineLevel = 'overdue' | 'soon' | 'far';

/**
 * Уровень близости дедлайна:
 * overdue — прошёл, soon — до 3 дней, far — больше 3 дней. null — нет дедлайна.
 */
export const deadlineLevel = (iso: string | null | undefined, days: number = 3): DeadlineLevel | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() < Date.now()) return 'overdue';
  // Граница — конец дня через N календарных дней (как на бэке)
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  limit.setHours(23, 59, 59, 999);
  return d.getTime() <= limit.getTime() ? 'soon' : 'far';
};