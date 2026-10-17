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

/** Удаляет из JSON узлы, ссылающиеся на вложение attachment:<id> (image и attachmentChip). */
export const removeAttachmentFromJson = (node: any, id: string): any => {
  if (!node) return node;
  if (Array.isArray(node)) return node.map((n) => removeAttachmentFromJson(n, id));
  if (node.type === 'image' && node.attrs?.src === `attachment:${id}`) return null;
  if (node.type === 'attachmentChip' && node.attrs?.id === id) return null;
  if (node.content) {
    const content = node.content.map((c: any) => removeAttachmentFromJson(c, id)).filter((c: any) => c !== null);
    return { ...node, content };
  }
  return node;
};

/**
 * После парсинга Markdown ссылки вида [filename](attachment:<id>) приходят как text с link-mark.
 * Превращаем их в узлы attachmentChip (ревью Клода: MD не должен терять вложения).
 */
const ATT_RE = /^attachment:([a-f0-9]{24})$/i;

export const convertAttachmentLinks = (node: any): any => {
  if (!node) return node;
  if (Array.isArray(node)) return node.map(convertAttachmentLinks);
  if (node.content) {
    const out: any[] = [];
    for (const child of node.content) {
      if (child.type === 'text' && Array.isArray(child.marks)) {
        const link = child.marks.find((m: any) => m.type === 'link' && ATT_RE.test(m.attrs?.href || ''));
        if (link) {
          const id = ATT_RE.exec(link.attrs.href)![1];
          const filename = child.text || 'файл';
          const rest = child.marks.filter((m: any) => m !== link);
          // Сохраняем прочие marks (bold и т.п.) как текст до/после не нужно — упрощаем: один чип.
          out.push({ type: 'attachmentChip', attrs: { id, filename, mime: '' } });
          if (rest.length) { /* потеря прочих marks на ссылке — приемлемо */ }
          continue;
        }
      }
      out.push(convertAttachmentLinks(child));
    }
    return { ...node, content: out };
  }
  return node;
};

