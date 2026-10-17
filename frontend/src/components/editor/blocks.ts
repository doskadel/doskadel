import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Объединить выделенные абзацы в ОДИН блок кода.
 * ВАЖНО: не удаляем пустые абзацы — это точки для курсора (Gapcursor/TrailingNode).
 */
export function makeCodeBlock(editor: Editor) {
  const { state } = editor;
  const { from, to, empty } = state.selection;
  const codeType = state.schema.nodes.codeBlock;
  if (!codeType) return false;

  // Уже в блоке кода — снимаем, разбивая по строкам на абзацы.
  if (editor.isActive('codeBlock')) {
    let codePos = -1;
    let codeNode: any = null;
    for (let d = state.selection.$from.depth; d > 0; d--) {
      const n = state.selection.$from.node(d);
      if (n.type.name === 'codeBlock') {
        codePos = state.selection.$from.before(d);
        codeNode = n;
        break;
      }
    }
    if (codePos >= 0 && codeNode) {
      const text = codeNode.textContent || '';
      const paraType = state.schema.nodes.paragraph;
      const paras = text.split('\n').map((line: string) =>
        paraType.create(null, line ? state.schema.text(line) : null)
      );
      const tr = state.tr.replaceWith(codePos, codePos + codeNode.nodeSize, paras);
      editor.view.dispatch(tr);
      editor.commands.focus();
      return true;
    }
  }

  if (empty) {
    return editor.chain().focus().toggleCodeBlock().run();
  }

  // Собираем текст выделенных блоков в один код-блок.
  const lines: string[] = [];
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isTextblock) {
      lines.push(node.textContent);
      return false;
    }
    return true;
  });
  const text = lines.join('\n');
  const codeNode = codeType.create(null, text ? state.schema.text(text) : null);
  const tr = state.tr.replaceWith(from, to, codeNode);
  // Курсор — в начало текста внутри код-блока.
  try {
    tr.setSelection(TextSelection.create(tr.doc, from + 1));
  } catch { /* ignore */ }
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Обернуть выделенные абзацы в ОДНУ цитату (или снять).
 */
export function makeBlockquote(editor: Editor) {
  const { state } = editor;
  const { empty } = state.selection;
  if (editor.isActive('blockquote')) {
    return editor.chain().focus().toggleBlockquote().run();
  }
  if (empty) {
    return editor.chain().focus().toggleBlockquote().run();
  }
  return editor.chain().focus().wrapIn('blockquote').run();
}
