/** Простая очистка Markdown до plain-text (для превью в списках). */
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
    // заголовки
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // цитаты
    .replace(/^\s{0,3}>\s?/gm, '')
    // списки
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    // выделение
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    // горизонтальные линии
    .replace(/^\s{0,3}[-*_]{3,}\s*$/gm, ' ')
    // таблицы
    .replace(/\|/g, ' ')
    // множественные пробелы/переносы
    .replace(/\s+/g, ' ')
    .trim();
}
