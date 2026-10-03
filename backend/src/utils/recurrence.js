/**
 * Повторяемость (F1c). recurrence = {
 *   freq:'daily'|'weekly'|'monthly', interval, byWeekday:[0-6], byMonthDay:1-31,
 *   time:'HH:mm', until:Date|null, count:number|null, tz:IANA-зона
 * }
 * Вхождения считаются в зоне tz (учёт летнего времени), хранятся в UTC.
 * Горизонт ограничен (HORIZON_MONTHS).
 */
const { DateTime } = require('luxon');

const HORIZON_MONTHS = 12;
const DEFAULT_TZ = 'Europe/Moscow';
const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_RU_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const getTimeParts = (time) => {
  const [h, m] = (time || '00:00').split(':').map((v) => parseInt(v, 10));
  return { hours: h, minutes: m };
};

/**
 * Следующие вхождения от fromExclusive, не более count штук, в пределах горизонта.
 * @returns {Date[]} даты в UTC
 */
const getNextOccurrences = (recurrence, fromExclusive, count = 7) => {
  if (!recurrence || !recurrence.freq) return [];
  const tz = recurrence.tz || DEFAULT_TZ;
  const { hours, minutes } = getTimeParts(recurrence.time);
  const from = DateTime.fromJSDate(new Date(fromExclusive), { zone: tz });
  const horizonEnd = from.plus({ months: HORIZON_MONTHS });
  const interval = Math.max(1, recurrence.interval || 1);
  const until = recurrence.until ? DateTime.fromJSDate(new Date(recurrence.until), { zone: tz }) : null;
  const maxCount = recurrence.count || null;
  const result = [];

  const tryPush = (dt) => {
    if (!dt.isValid) return false;
    if (dt <= from) return true;
    if (until && dt > until) return false;
    if (dt > horizonEnd) return false;
    if (maxCount && result.length >= maxCount) return false;
    result.push(dt.toUTC().toJSDate());
    return true;
  };

  if (recurrence.freq === 'daily') {
    let cursor = from.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    if (cursor <= from) cursor = cursor.plus({ days: 1 });
    let guard = 0;
    while (result.length < count && guard < 400) {
      guard++;
      if (!tryPush(cursor)) break;
      cursor = cursor.plus({ days: interval });
    }
    return result;
  }

  if (recurrence.freq === 'weekly') {
    const days = (recurrence.byWeekday && recurrence.byWeekday.length ? recurrence.byWeekday : [1]).slice().sort();
    // luxon: weekday 1=пн..7=вс; наши byWeekday 0=вс..6=сб -> конвертируем
    const luxonDays = days.map((d) => (d === 0 ? 7 : d));
    let cursor = from.startOf('day').set({ hour: hours, minute: minutes });
    let guard = 0;
    while (result.length < count && guard < 400 * 7) {
      guard++;
      if (luxonDays.includes(cursor.weekday)) {
        if (cursor > from) { if (!tryPush(cursor)) break; }
      }
      cursor = cursor.plus({ days: 1 });
    }
    return result;
  }

  if (recurrence.freq === 'monthly') {
    const dom = recurrence.byMonthDay || 1;
    let cursor = from.startOf('month').set({ day: Math.min(dom, from.daysInMonth), hour: hours, minute: minutes });
    if (cursor <= from) cursor = cursor.plus({ months: interval });
    let guard = 0;
    while (result.length < count && guard < 240) {
      guard++;
      const day = Math.min(dom, cursor.daysInMonth);
      const candidate = cursor.set({ day, hour: hours, minute: minutes });
      if (!tryPush(candidate)) break;
      cursor = cursor.plus({ months: interval });
    }
    return result;
  }

  return [];
};

const formatRecurrence = (recurrence) => {
  if (!recurrence || !recurrence.freq) return '';
  const time = recurrence.time || '';
  if (recurrence.freq === 'daily') return `Каждый день, ${time}`;
  if (recurrence.freq === 'weekly') {
    const d = (recurrence.byWeekday && recurrence.byWeekday[0]) ?? 1;
    return `Каждый ${WEEKDAYS_RU[d]}, ${time}`;
  }
  if (recurrence.freq === 'monthly') return `${recurrence.byMonthDay ?? 1}-го числа, ${time}`;
  return '';
};

module.exports = { getNextOccurrences, formatRecurrence, DEFAULT_TZ, HORIZON_MONTHS };
