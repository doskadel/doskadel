/** Очистка Markdown до plain-text (для превью в списках). */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    // код-блоки
    .replace(/```[\s\S]*?```/g, ' ')
    // inline-код
    .replace(/`([^`]+)`/g, '$1')
    // картинки
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // ссылки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // чеклист-маркеры [ ] / [x] / [X]
    .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s*/gm, '')
    // заголовки
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // цитаты
    .replace(/^\s{0,3}>\s?/gm, '')
    // списки
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    // выделение
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    // горизонтальные линии и табличные разделители (---|---)
    .replace(/^\s{0,3}[-*_]{3,}[\s|:-]*$/gm, ' ')
    .replace(/\|?\s*:?-{3,}:?\s*/g, ' ')
    // таблицы: разделители колонок
    .replace(/\|/g, ' ')
    // остатки одиночных маркеров таблиц
    .replace(/^\s*[-:]\s*$/gm, ' ')
    // множественные пробелы/переносы
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Извлечь plain-text из TipTap JSON (для превью JSON-статей).
 * Обходит дерево и собирает текстовые узлы; переносы блоков -> пробел.
 */
export function plainTextFromJson(node: any): string {
  if (!node) return '';
  const parts: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === 'text' && typeof n.text === 'string') {
      parts.push(n.text);
      return;
    }
    if (n.type === 'hardBreak') {
      parts.push(' ');
      return;
    }
    if (n.type === 'image') {
      return; // картинки в превью не нужны
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
      // конец блочного узла -> пробел (чтобы слова не слипались)
      if (['paragraph', 'heading', 'listItem', 'blockquote', 'tableRow'].includes(n.type)) {
        parts.push(' ');
      }
    }
  };
  walk(node);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
