/**
 * Нормализация документа после парсинга Markdown.
 * tiptap-markdown с breaks:true превращает одиночные \n в hardBreak внутри ОДНОГО параграфа,
 * из-за чего блочные команды (цитата, код) применяются ко всему абзацу целиком.
 * Разбиваем параграф по hardBreak на отдельные абзацы — по одной строке.
 */

const isHardBreak = (c: any) => c && c.type === 'hardBreak';

export const splitHardBreaks = (node: any): any[] => {
  if (node.type === 'paragraph' && node.content?.some(isHardBreak)) {
    const parts: any[][] = [[]];
    for (const c of node.content) {
      if (isHardBreak(c)) parts.push([]);
      else parts[parts.length - 1].push(c);
    }
    return parts.map((p) => ({ ...node, content: p.length ? p : undefined }));
  }
  if (node.content) {
    return [{ ...node, content: node.content.flatMap(splitHardBreaks) }];
  }
  return [node];
};

export const normalizeDoc = (doc: any) => splitHardBreaks(doc)[0];
