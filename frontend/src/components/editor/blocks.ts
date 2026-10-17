import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { formatCode } from './codeFormat';

/**
 * Toggle «код» с сохранением выделения.
 * - Выделил N строк -> код -> повторное нажатие -> снова текст, то же выделение.
 * - Одна строка (курсор) -> код -> повторное нажатие -> курсор на этой строке.
 * Заменяем ЦЕЛЫЕ блоки (а не текстовые позиции внутри абзаца), иначе остаётся пустой абзац.
 */
export function makeCodeBlock(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const codeType = state.schema.nodes.codeBlock;
  if (!codeType) return false;


  // --- OFF: уже в коде -> разбить обратно на абзацы, сохранив выделение ---
  if (editor.isActive('codeBlock')) {
    const $from = selection.$from;
    let depth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'codeBlock') { depth = d; break; }
    }
    if (depth < 0) return false;
    const start = $from.before(depth);
    const codeNode = $from.node(depth);
    const end = start + codeNode.nodeSize;
    const text = codeNode.textContent || '';
    const paraType = state.schema.nodes.paragraph;
    // Обрезаем ПУСТЫЕ строки в конце/начале кода — это артефакты Enter внутри блока.
    const rawLines = text.split('\n');
    while (rawLines.length > 1 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();
    while (rawLines.length > 1 && rawLines[0].trim() === '') rawLines.shift();
    const paras = rawLines.map((line: string) =>
      paraType.create(null, line ? state.schema.text(line) : null)
    );
    const tr = state.tr.replaceWith(start, end, paras);
    // Удаляем пустой абзац вплотную ПОСЛЕ восстановленного текста
    // (он остался от Enter перед кодом — это и есть «пустая строка»).
    {
      const newEnd = start + paras.reduce((s: number, p: any) => s + p.nodeSize, 0);
      const $after = tr.doc.resolve(Math.min(newEnd, tr.doc.content.size));
      const after = $after.nodeAfter;
      if (after && after.type.name === 'paragraph' && after.content.size === 0) {
        tr.delete(newEnd, newEnd + after.nodeSize);
      }
    }
    try {
      if (paras.length <= 1) {
        const pos = Math.min(start + 1 + text.length, tr.doc.content.size);
        tr.setSelection(TextSelection.create(tr.doc, pos));
      } else {
        // выделяем весь восстановленный текст (от начала первого абзаца до конца последнего)
        let pos = start;
        let firstTextStart = -1;
        let lastTextEnd = -1;
        for (let i = 0; i < paras.length; i++) {
          const p = paras[i];
          const pTextStart = pos + 1;
          const pTextEnd = pTextStart + p.content.size;
          if (i === 0) firstTextStart = pTextStart;
          if (i === paras.length - 1) lastTextEnd = pTextEnd;
          pos += p.nodeSize;
        }
        if (firstTextStart >= 0 && lastTextEnd >= 0) {
          tr.setSelection(TextSelection.create(tr.doc, firstTextStart, Math.min(lastTextEnd, tr.doc.content.size)));
        }
      }
    } catch { /* ignore */ }
    editor.view.dispatch(tr);
    editor.commands.focus();
    return true;
  }

  // --- ON: одна строка без выделения ---
  if (selection.empty) {
    return editor.chain().focus().toggleCodeBlock().run();
  }

  // --- ON: выделение -> один блок кода (заменяем целые блоки) ---
  const $from = selection.$from;
  const $to = selection.$to;
  let dFrom = $from.depth;
  while (dFrom > 0 && !$from.node(dFrom).isTextblock) dFrom--;
  let dTo = $to.depth;
  while (dTo > 0 && !$to.node(dTo).isTextblock) dTo--;
  const blockFrom = $from.before(dFrom);
  const blockTo = $to.after(dTo);

  const lines: string[] = [];
  state.doc.nodesBetween(blockFrom, blockTo, (node) => {
    if (node.isTextblock) { lines.push(node.textContent); return false; }
    return true;
  });
  const raw = lines.join('\n');
  // Автоформат JSON/XML при создании код-блока из выделения.
  const fmt = formatCode(raw);
  const text = fmt.lang ? fmt.code : raw;
  const codeNode = codeType.create(fmt.lang ? { language: fmt.lang } : null, text ? state.schema.text(text) : null);
  const tr = state.tr.replaceWith(blockFrom, blockTo, codeNode);

  // Убираем пустые абзацы непосредственно над и под созданным блоком кода
  // (они оставались от предыдущих Enter и давали «пустую строку»).
  const removeAdjacentEmpty = (pos: number, dir: -1 | 1) => {
    const $pos = tr.doc.resolve(pos);
    const node = dir === -1 ? $pos.nodeBefore : $pos.nodeAfter;
    if (node && node.type.name === 'paragraph' && node.content.size === 0) {
      if (dir === -1) tr.delete(pos - node.nodeSize, pos);
      else tr.delete(pos, pos + node.nodeSize);
    }
  };
  let codePos = -1;
  tr.doc.descendants((n: any, p: number) => {
    if (codePos < 0 && n.type.name === 'codeBlock') { codePos = p; return false; }
    return codePos < 0;
  });
  if (codePos >= 0) {
    const cb = tr.doc.nodeAt(codePos);
    if (cb) {
      removeAdjacentEmpty(codePos, -1);
      // после удаления над — позиция кода сдвинулась; найдём заново для «под»
      let cp2 = -1;
      tr.doc.descendants((n: any, p: number) => {
        if (cp2 < 0 && n.type.name === 'codeBlock') { cp2 = p; return false; }
        return cp2 < 0;
      });
      const cb2 = cp2 >= 0 ? tr.doc.nodeAt(cp2) : null;
      if (cb2) removeAdjacentEmpty(cp2 + cb2.nodeSize, 1);
    }
  }

  // Выделяем весь текст внутри нового код-блока (ищем его в итоговом документе).
  let finalPos = -1;
  tr.doc.descendants((n: any, p: number) => {
    if (finalPos < 0 && n.type.name === 'codeBlock') { finalPos = p; return false; }
    return finalPos < 0;
  });
  if (finalPos >= 0) {
    try {
      const cb = tr.doc.nodeAt(finalPos);
      const selFrom = finalPos + 1;
      const selTo = Math.min(finalPos + 1 + (cb ? cb.content.size : text.length), tr.doc.content.size);
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
    } catch { /* ignore */ }
  }
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Вставить горизонтальный разделитель ПОСЛЕ текущей строки/выделения (не вместо).
 * Под ним добавляется пустой абзац, чтобы можно было сразу печатать.
 */
export function makeHorizontalRule(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const hrType = state.schema.nodes.horizontalRule;
  const paraType = state.schema.nodes.paragraph;
  if (!hrType) return false;

  const $from = selection.$from;
  const $to = selection.$to;
  let dFrom = $from.depth;
  while (dFrom > 0 && !$from.node(dFrom).isTextblock) dFrom--;
  let dTo = $to.depth;
  while (dTo > 0 && !$to.node(dTo).isTextblock) dTo--;

  // Позиция вставки — сразу после последнего затронутого блока.
  const insertPos = selection.empty ? $from.after(dFrom) : $to.after(dTo);

  const nodes: any[] = [hrType.create()];
  if (paraType) nodes.push(paraType.create());
  const tr = state.tr.insert(insertPos, nodes);
  // Курсор — в новый пустой абзац под разделителем.
  try {
    const cursorPos = Math.min(insertPos + hrType.create().nodeSize + 1, tr.doc.content.size);
    tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  } catch { /* ignore */ }
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Обернуть выделенные абзацы в ОДНУ цитату (или снять). wrapIn сохраняет выделение.
 */
export function makeBlockquote(editor: Editor) {
  const { empty } = editor.state.selection;
  if (editor.isActive('blockquote')) {
    return editor.chain().focus().toggleBlockquote().run();
  }
  if (empty) {
    return editor.chain().focus().toggleBlockquote().run();
  }
  return editor.chain().focus().wrapIn('blockquote').run();
}
