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