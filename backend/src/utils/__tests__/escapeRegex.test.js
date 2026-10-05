const escapeRegex = require('../escapeRegex');

describe('escapeRegex', () => {
  test('экранирует спецсимволы', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('(x)[y]')).toBe('\\(x\\)\\[y\\]');
  });

  test('обычный текст не меняется', () => {
    expect(escapeRegex('привет мир')).toBe('привет мир');
  });

  test('экранированный текст безопасен в RegExp', () => {
    const re = new RegExp(escapeRegex('a+b'), 'i');
    expect(re.test('a+b')).toBe(true);
    expect(re.test('aab')).toBe(false);
  });
});
