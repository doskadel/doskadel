const { isRecurring, SINGLE, RECURRING } = require('../taskKinds');

describe('taskKinds', () => {
  test('isRecurring: true только при recurrence.freq', () => {
    expect(isRecurring({ recurrence: { freq: 'daily' } })).toBe(true);
    expect(isRecurring({ recurrence: null })).toBe(false);
    expect(isRecurring({ recurrence: {} })).toBe(false);
    expect(isRecurring({})).toBe(false);
    expect(isRecurring(null)).toBe(false);
  });

  test('SINGLE — условие «recurrence отсутствует или null»', () => {
    expect(JSON.stringify(SINGLE)).toContain('$or');
  });

  test('RECURRING — условие «recurrence.freq существует и не null»', () => {
    expect(RECURRING['recurrence.freq']).toEqual({ $exists: true, $ne: null });
  });
});
