import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Перетаскивание высоты строки таблицы за нижнюю границу (аналог ширины столбца).
 * Ловим только клик по самой зоне (e.target === tr, т.к. ::after даёт target=tr),
 * а не любой клик у нижнего края — иначе ломается выделение текста.
 * Старт драга — только при сдвиге мыши >3px (одиночные клики не съедаются).
 */
export const rowResizePlugin = new Plugin({
  key: new PluginKey('rowResize'),
  view(editorView: EditorView) {
    let startY = 0;
    let startH = 0;
    let trEl: HTMLElement | null = null;
    let pos = -1;
    let armed = false;
    let dragging = false;

    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName !== 'TR') return;

      let found = -1;
      try {
        const p = editorView.posAtDOM(el, 0);
        const $p = editorView.state.doc.resolve(p);
        for (let d = $p.depth; d > 0; d--) {
          if ($p.node(d).type.name === 'tableRow') { found = $p.before(d); break; }
        }
      } catch { return; }
      if (found < 0) return;

      startY = e.clientY;
      startH = el.getBoundingClientRect().height;
      trEl = el;
      pos = found;
      armed = true;
      dragging = false;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!armed || !trEl) return;
      if (!dragging) {
        if (Math.abs(e.clientY - startY) <= 3) return;
        dragging = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
      }
      const h = Math.max(24, startH + (e.clientY - startY));
      trEl.style.height = h + 'px';
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const wasDragging = dragging;
      const el = trEl;
      const p0 = pos;
      armed = false;
      dragging = false;
      trEl = null;
      if (!wasDragging || !el) return;
      const h = Math.max(24, Math.round(startH + (e.clientY - startY)));
      el.style.height = '';
      const { state, dispatch } = editorView;
      const rowNode = state.doc.nodeAt(p0);
      if (!rowNode || rowNode.type.name !== 'tableRow') return;
      dispatch(state.tr.setNodeMarkup(p0, undefined, { ...rowNode.attrs, rowHeight: h }));
    };

    editorView.dom.addEventListener('mousedown', onMouseDown);
    return {
      destroy() {
        editorView.dom.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      },
    };
  },
});
