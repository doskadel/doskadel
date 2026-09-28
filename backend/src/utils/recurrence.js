/**
 * Утилиты для работы с повторяющимися задачами.
 *
 * recurrence = {
 *   type: 'daily' | 'weekly' | 'monthly',
 *   time: 'HH:mm',
 *   dayOfWeek: 0-6,     // только weekly (0 = вс)
 *   dayOfMonth: 1-31    // только monthly
 * }
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * Собирает Date из локальных компонентов и возвращает UTC.
 * time — 'HH:mm' в локальном времени пользователя? Нет: считаем UTC,
 * потому что храним всё в UTC, а показываем локально на фронте.
 */
const buildUtcDate = (year, month, day, hours, minutes) => {
  return new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
};

const getTimeParts = (time) => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return { hours: h, minutes: m };
};

/**
 * Возвращает массив дат (UTC) следующих вхождений, начиная с fromExclusive,
 * в количестве count штук.
 */
const getNextOccurrences = (recurrence, fromExclusive, count = 7) => {
  if (!recurrence || !recurrence.type || !recurrence.time) return [];

  const { hours, minutes } = getTimeParts(recurrence.time);
  const result = [];
  const from = new Date(fromExclusive);

  if (recurrence.type === 'daily') {
    // Начинаем с сегодняшнего дня, но если время уже прошло — со следующего
    let cursor = new Date(Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      hours,
      minutes,
      0,
      0
    ));
    if (cursor.getTime() <= from.getTime()) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (let i = 0; i < count; i++) {
      result.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  if (recurrence.type === 'weekly') {
    const targetDow = recurrence.dayOfWeek ?? 1; // по умолчанию понедельник
    let cursor = new Date(Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      hours,
      minutes,
      0,
      0
    ));
    // Сдвигаем до ближайшего targetDow
    while (cursor.getUTCDay() !== targetDow || cursor.getTime() <= from.getTime()) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (let i = 0; i < count; i++) {
      result.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return result;
  }

  if (recurrence.type === 'monthly') {
    const targetDom = recurrence.dayOfMonth ?? 1;
    let year = from.getUTCFullYear();
    let month = from.getUTCMonth();

    while (result.length < count) {
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const actualDay = Math.min(targetDom, lastDayOfMonth);
      const candidate = buildUtcDate(year, month, actualDay, hours, minutes);
      if (candidate.getTime() > from.getTime()) {
        result.push(candidate);
      }
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    return result;
  }

  return [];
};

/**
 * Форматирует правило в читаемый текст: "Каждый день, 14:00"
 */
const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_RU_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const formatRecurrence = (recurrence) => {
  if (!recurrence || !recurrence.type) return '';
  const time = recurrence.time || '';

  if (recurrence.type === 'daily') {
    return `Каждый день, ${time}`;
  }
  if (recurrence.type === 'weekly') {
    const dow = WEEKDAYS_RU_SHORT[recurrence.dayOfWeek ?? 1] || '';
    return `Каждый ${WEEKDAYS_RU[recurrence.dayOfWeek ?? 1]}, ${time}`;
  }
  if (recurrence.type === 'monthly') {
    return `${recurrence.dayOfMonth ?? 1}-го числа, ${time}`;
  }
  return '';
};

module.exports = {
  getNextOccurrences,
  formatRecurrence
};