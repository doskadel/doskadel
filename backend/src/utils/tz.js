const { DateTime, IANAZone } = require('luxon');

/** Валидна ли IANA-зона. */
function isValidTz(tz) {
  return typeof tz === 'string' && tz.length > 0 && IANAZone.isValidZone(tz);
}

/**
 * Зона пользователя для расчётов ('сегодня', границы дня, recurrence.tz по умолчанию).
 * Приоритет: явная зона (заголовок X-Timezone, валидированная) -> user.timezone -> UTC.
 * @param {object} user
 * @param {string} [headerTz]
 */
function resolveTz(user, headerTz) {
  if (isValidTz(headerTz)) return headerTz;
  if (user && isValidTz(user.timezone)) return user.timezone;
  return 'UTC';
}

/** Начало дня (00:00) в зоне, в UTC. */
function startOfDayUtc(date, tz) {
  return DateTime.fromJSDate(new Date(date), { zone: tz }).startOf('day').toUTC().toJSDate();
}

/** Конец дня (23:59:59.999) в зоне, в UTC. */
function endOfDayUtc(date, tz) {
  return DateTime.fromJSDate(new Date(date), { zone: tz }).endOf('day').toUTC().toJSDate();
}

module.exports = { isValidTz, resolveTz, startOfDayUtc, endOfDayUtc };
