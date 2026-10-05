const { getNextOccurrences } = require('../recurrence');

const TZ = 'Europe/Moscow';

// helper: список дат в МСК как 'YYYY-MM-DD HH:mm'
const fmt = (dates) => dates.map((d) => {
  const iso = new Date(d).toISOString();
  // MSK = UTC+3
  const ms = new Date(d).getTime() + 3 * 3600 * 1000;
  const x = new Date(ms);
  return x.toISOString().slice(0, 16).replace('T', ' ');
});

describe('getNextOccurrences', () => {
  test('daily: 5 дней от даты', () => {
    const rec = { freq: 'daily', interval: 1, time: '09:00', tz: TZ };
    const from = new Date('2026-10-05T00:00:00Z'); // 05.10 03:00 MSK
    const res = getNextOccurrences(rec, from, 5);
    expect(fmt(res)).toEqual([
      '2026-10-05 09:00',
      '2026-10-06 09:00',
      '2026-10-07 09:00',
      '2026-10-08 09:00',
      '2026-10-09 09:00',
    ]);
  });

  test('daily: не раньше from (время уже прошло)', () => {
    const rec = { freq: 'daily', interval: 1, time: '09:00', tz: TZ };
    const from = new Date('2026-10-05T10:00:00Z'); // 13:00 MSK, 09:00 прошло
    const res = getNextOccurrences(rec, from, 1);
    expect(fmt(res)).toEqual(['2026-10-06 09:00']);
  });

  test('weekly: только Пн/Ср/Пт', () => {
    const rec = { freq: 'weekly', interval: 1, byWeekday: [1, 3, 5], time: '09:00', tz: TZ };
    const from = new Date('2026-10-05T00:00:00Z'); // 05.10.2026 — Пн
    const res = getNextOccurrences(rec, from, 4);
    expect(fmt(res)).toEqual([
      '2026-10-05 09:00',
      '2026-10-07 09:00',
      '2026-10-09 09:00',
      '2026-10-12 09:00',
    ]);
  });

  test('monthly: 15-е число', () => {
    const rec = { freq: 'monthly', interval: 1, byMonthDay: 15, time: '12:00', tz: TZ };
    const from = new Date('2026-10-01T00:00:00Z');
    const res = getNextOccurrences(rec, from, 3);
    expect(fmt(res)).toEqual([
      '2026-10-15 12:00',
      '2026-11-15 12:00',
      '2026-12-15 12:00',
    ]);
  });

  test('until: не позже даты', () => {
    const rec = { freq: 'daily', interval: 1, time: '09:00', tz: TZ, until: new Date('2026-10-07T00:00:00Z') };
    const from = new Date('2026-10-04T00:00:00Z'); // 04.10 03:00 MSK — до 09:00
    const res = getNextOccurrences(rec, from, 10);
    expect(fmt(res)).toEqual(['2026-10-04 09:00', '2026-10-05 09:00', '2026-10-06 09:00']);
  });

  test('без freq — пусто', () => {
    expect(getNextOccurrences({}, new Date(), 5)).toEqual([]);
    expect(getNextOccurrences(null, new Date(), 5)).toEqual([]);
  });
});
