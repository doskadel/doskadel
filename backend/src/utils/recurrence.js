/**
 * Утилиты повторяемости (F1c). recurrence = {
 *   freq: 'daily'|'weekly'|'monthly', interval, byWeekday:[0-6], byMonthDay:1-31,
 *   time:'HH:mm', until:Date|null, count:number|null, tz:string|null
 * }
 * Этап 1: базовая поддержка нового формата (freq/byWeekday/byMonthDay), интервал=1.
 * Полная логика (interval, until/count, tz) — этап 2.
 */

const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_RU_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const getTimeParts = (time) => {
  const [h, m] = (time || '00:00').split(':').map((v) => parseInt(v, 10));
  return { hours: h, minutes: m };
};

const atTime = (y, mo, d, h, mi) => new Date(Date.UTC(y, mo, d, h, mi, 0, 0));

/**
 * Следующие вхождения от fromExclusive, count штук.
 */
const getNextOccurrences = (recurrence, fromExclusive, count = 7) => {
  if (!recurrence || !recurrence.freq) return [];
  const { hours, minutes } = getTimeParts(recurrence.time);
  const from = new Date(fromExclusive);
  const result = [];
  const interval = Math.max(1, recurrence.interval || 1);
  const until = recurrence.until ? new Date(recurrence.until) : null;
  const maxCount = recurrence.count || null;
  const push = (d) => {
    if (until && d.getTime() > until.getTime()) return false;
    if (maxCount && result.length >= maxCount) return false;
    result.push(d);
    return true;
  };

  if (recurrence.freq === 'daily') {
    let cursor = atTime(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hours, minutes);
    if (cursor.getTime() <= from.getTime()) cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (result.length < count) {
      if (!push(new Date(cursor))) break;
      cursor.setUTCDate(cursor.getUTCDate() + interval);
    }
    return result;
  }

  if (recurrence.freq === 'weekly') {
    const days = (recurrence.byWeekday && recurrence.byWeekday.length ? recurrence.byWeekday : [1]).slice().sort();
    let cursor = atTime(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hours, minutes);
    let guard = 0;
    while (result.length < count && guard < 366 * 5) {
      guard++;
      const dow = cursor.getUTCDay();
      if (days.includes(dow) && cursor.getTime() > from.getTime()) {
        if (!push(new Date(cursor))) break;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  if (recurrence.freq === 'monthly') {
    const dom = recurrence.byMonthDay || 1;
    let year = from.getUTCFullYear();
    let month = from.getUTCMonth();
    let guard = 0;
    while (result.length < count && guard < 240) {
      guard++;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const candidate = atTime(year, month, Math.min(dom, lastDay), hours, minutes);
      if (candidate.getTime() > from.getTime()) {
        if (!push(candidate)) break;
      }
      month += interval;
      while (month > 11) { month -= 12; year += 1; }
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

module.exports = { getNextOccurrences, formatRecurrence };
