/**
 * Гибридное хранение описания/контента (ADR 2026-10-16):
 * json — источник правды (JSON TipTap), md — производный Markdown (regex-поиск, старые клиенты).
 * Общий helper для Article и Task, чтобы логика не дублировалась.
 */

// Mongo запрещает ключи с $ в начале и с точкой (операторы/пути).
const isUnsafeKey = (k) => k.startsWith('$') || k.includes('.');

/** Рекурсивная проверка структуры JSON на небезопасные ключи. */
const hasUnsafeKeys = (node) => {
  if (Array.isArray(node)) return node.some(hasUnsafeKeys);
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (isUnsafeKey(k)) return true;
      if (hasUnsafeKeys(node[k])) return true;
    }
  }
  return false;
};

/**
 * Валидация descriptionJson/contentJson (общая). Возвращает строку ошибки или null.
 * @param {any} json
 * @param {object} [opts] { field: 'descriptionJson'|'contentJson', maxBytes }
 */
const validateDocJson = (json, opts = {}) => {
  const field = opts.field || 'descriptionJson';
  const maxBytes = opts.maxBytes || 1024 * 1024; // 1 МБ на документ
  if (json === null) return null;
  if (typeof json !== 'object' || Array.isArray(json)) return `${field} must be an object`;
  if (json.type !== 'doc') return `${field}.type must be 'doc'`;
  if (hasUnsafeKeys(json)) return `${field} contains forbidden keys ($ or .)`;
  let size;
  try {
    size = Buffer.byteLength(JSON.stringify(json), 'utf8');
  } catch (e) {
    return `${field} is not serializable`;
  }
  if (size > maxBytes) return `${field} too large (max ${Math.floor(maxBytes / 1024)}kb)`;
  return null;
};

/**
 * Применяет поля описания из тела запроса к объекту обновления/создания.
 * Правило (ревью 2026-10-17):
 * - пришёл descriptionJson -> источник правды json, format='json'; description (md) сохраняется, если передан;
 * - пришёл только description на json-задаче -> сброс в md (descriptionJson=null, format='md'),
 *   чтобы источник правды не устаревал;
 * - пришёл только descriptionFormat -> меняем только формат.
 * @param {object} body
 * @param {object} target — объект, куда писать поля
 */
const applyDescriptionFields = (body, target, names = {}) => {
  const jsonKey = names.json || 'descriptionJson';
  const mdKey = names.md || 'description';
  const fmtKey = names.format || 'descriptionFormat';
  if (body[jsonKey] !== undefined) {
    target[jsonKey] = body[jsonKey];
    target[fmtKey] = 'json';
    if (body[mdKey] !== undefined) target[mdKey] = body[mdKey];
  } else if (body[mdKey] !== undefined) {
    target[mdKey] = body[mdKey];
    // Старый клиент/импорт: json больше не источник правды -> сбрасываем.
    target[jsonKey] = null;
    target[fmtKey] = 'md';
  } else if (body[fmtKey] !== undefined) {
    target[fmtKey] = body[fmtKey];
  }
  return target;
};

module.exports = { validateDocJson, applyDescriptionFields, hasUnsafeKeys };
