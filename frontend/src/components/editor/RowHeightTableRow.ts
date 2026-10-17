import { TableRow } from '@tiptap/extension-table';

/**
 * TableRow с атрибутом rowHeight (px, число). Позволяет менять высоту строки
 * кнопками в панели таблицы. ProseMirror/TipTap не даёт resize высоты «из коробки».
 */
export const RowHeightTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute('data-row-height');
          return v ? parseInt(v, 10) : null;
        },
        renderHTML: (attrs: Record<string, any>) => {
          if (!attrs.rowHeight) return {};
          return {
            'data-row-height': String(attrs.rowHeight),
            style: `height: ${attrs.rowHeight}px`,
          };
        },
      },
    };
  },
});
