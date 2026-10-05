const { getNextOccurrences } = require('../recurrence');

// Проверка границы дня в зоне: полночь MSK = 21:00 UTC предыдущего дня.
describe('tz-границы', () => {
  test('ежедневное 00:00 MSK = 21:00 UTC', () => {
    const rec = { freq: 'daily', interval: 1, time: '00:00', tz: 'Europe/Moscow' };
    const from = new Date('2026-10-05T00:00:00Z');
    const res = getNextOccurrences(rec, from, 1);
    // 00:00 MSK 06.10 = 21:00 UTC 05.10
    expect(new Date(res[0]).toISOString()).toBe('2026-10-05T21:00:00.000Z');
  });

  test('разные зоны дают разное UTC-время', () => {
    const msk = getNextOccurrences({ freq: 'daily', time: '09:00', tz: 'Europe/Moscow' }, new Date('2026-10-05T00:00:00Z'), 1);
    const utc = getNextOccurrences({ freq: 'daily', time: '09:00', tz: 'UTC' }, new Date('2026-10-05T00:00:00Z'), 1);
    expect(new Date(msk[0]).toISOString()).toBe('2026-10-05T06:00:00.000Z'); // 09:00 MSK = 06:00 UTC
    expect(new Date(utc[0]).toISOString()).toBe('2026-10-05T09:00:00.000Z');
  });
});
