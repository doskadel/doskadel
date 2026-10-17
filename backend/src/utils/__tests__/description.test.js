const { applyDescriptionFields, validateDocJson, hasUnsafeKeys } = require('../description');

describe('applyDescriptionFields', () => {
  test('json+md: оба сохраняются, format=json', () => {
    const t = applyDescriptionFields({ descriptionJson: { type: 'doc' }, description: 'hi' }, {});
    expect(t.descriptionJson).toEqual({ type: 'doc' });
    expect(t.description).toBe('hi');
    expect(t.descriptionFormat).toBe('json');
  });

  test('только description на json-задаче -> сброс в md/null (а)', () => {
    const t = applyDescriptionFields({ description: 'legacy' }, {});
    expect(t.description).toBe('legacy');
    expect(t.descriptionJson).toBe(null);
    expect(t.descriptionFormat).toBe('md');
  });

  test('только format меняет формат', () => {
    const t = applyDescriptionFields({ descriptionFormat: 'json' }, {});
    expect(t.descriptionFormat).toBe('json');
    expect(t.descriptionJson).toBeUndefined();
  });

  test('кастомные имена полей (article: contentJson/content/format)', () => {
    const t = applyDescriptionFields({ contentJson: { type: 'doc' }, content: 'x' }, {},
      { json: 'contentJson', md: 'content', format: 'format' });
    expect(t.contentJson).toEqual({ type: 'doc' });
    expect(t.content).toBe('x');
    expect(t.format).toBe('json');
  });
});

describe('validateDocJson', () => {
  test('ok: валидный doc', () => {
    expect(validateDocJson({ type: 'doc', content: [] })).toBe(null);
  });
  test('null допустим', () => {
    expect(validateDocJson(null)).toBe(null);
  });
  test('type не doc -> ошибка', () => {
    expect(validateDocJson({ type: 'paragraph' })).toMatch(/type must be 'doc'/);
  });
  test('массив -> ошибка', () => {
    expect(validateDocJson([])).toMatch(/must be an object/);
  });
  test('ключ с $ -> ошибка', () => {
    expect(validateDocJson({ type: 'doc', content: [{ $gt: 1 }] })).toMatch(/forbidden keys/);
  });
  test('ключ с точкой -> ошибка', () => {
    expect(validateDocJson({ type: 'doc', 'a.b': 1 })).toMatch(/forbidden keys/);
  });
  test('слишком большой -> ошибка', () => {
    const big = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(2000) }] }] };
    expect(validateDocJson(big, { maxBytes: 1000 })).toMatch(/too large/);
  });
});

describe('hasUnsafeKeys', () => {
  test('вложенные $', () => {
    expect(hasUnsafeKeys({ a: [{ b: { $x: 1 } }] })).toBe(true);
  });
  test('чистый объект', () => {
    expect(hasUnsafeKeys({ type: 'doc', content: [] })).toBe(false);
  });
});
