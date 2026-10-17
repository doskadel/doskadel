/** Автоформатирование кода: JSON и XML. Возвращает { lang, code }. */

export function prettyJson(text: string): string | null {
  try {
    const v = JSON.parse(text);
    return JSON.stringify(v, null, 2);
  } catch {
    return null;
  }
}

/** Простой pretty-print XML: перенос строки и отступ после каждого тега. */
export function prettyXml(text: string): string | null {
  const t = text.trim();
  if (!t.startsWith('<')) return null;
  // Разбиваем на токены: теги и текст между ними.
  const tokens = t.replace(/>\s*</g, '><').match(/<[^>]+>|[^<]+/g);
  if (!tokens) return null;
  const lines: string[] = [];
  let indent = 0;
  const pad = () => '  '.repeat(Math.max(0, indent));
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      lines.push(pad() + tk);
    } else if (tk.startsWith('<?') || tk.startsWith('<!')) {
      lines.push(pad() + tk);
    } else if (tk.startsWith('<') && tk.endsWith('/>')) {
      lines.push(pad() + tk);
    } else if (tk.startsWith('<')) {
      lines.push(pad() + tk);
      indent++;
    } else {
      const val = tk.trim();
      if (val) lines.push(pad() + val);
    }
  }
  return lines.join('\n');
}

/** Определить язык и отформатировать (если json/xml). */
export function formatCode(text: string): { lang: string; code: string } {
  const t = (text || '').trim();
  if (!t) return { lang: '', code: text };
  if (t.startsWith('{') || t.startsWith('[')) {
    const j = prettyJson(t);
    if (j) return { lang: 'json', code: j };
  }
  if (t.startsWith('<')) {
    const x = prettyXml(t);
    if (x) return { lang: 'xml', code: x };
  }
  return { lang: '', code: text };
}
