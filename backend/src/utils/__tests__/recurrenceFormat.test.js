const { formatRecurrence } = require('../recurrence');

describe('formatRecurrence', () => {
  test('daily', () => {
    expect(formatRecurrence({ freq: 'daily', time: '09:00' })).toBe('Каждый день, 09:00');
  });

  test('weekly: по дню недели', () => {
    expect(formatRecurrence({ freq: 'weekly', byWeekday: [1], time: '10:00' })).toBe('Каждый понедельник, 10:00');
    expect(formatRecurrence({ freq: 'weekly', byWeekday: [3], time: '08:00' })).toBe('Каждый среда, 08:00');
  });

  test('monthly', () => {
    expect(formatRecurrence({ freq: 'monthly', byMonthDay: 15, time: '12:00' })).toBe('15-го числа, 12:00');
  });

  test('без freq — пусто', () => {
    expect(formatRecurrence({})).toBe('');
    expect(formatRecurrence(null)).toBe('');
  });
});
