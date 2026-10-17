import { TableCell, TableHeader } from '@tiptap/extension-table';

const vAlignAttrs = () => ({
  verticalAlign: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-valign'),
    renderHTML: (attrs: Record<string, any>) =>
      attrs.verticalAlign ? { 'data-valign': attrs.verticalAlign } : {},
  },
});

/** Ячейка таблицы с вертикальным выравниванием (top|middle|bottom). */
export const VerticalAlignTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...vAlignAttrs() };
  },
});

/** Заголовок таблицы с вертикальным выравниванием. */
export const VerticalAlignTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...vAlignAttrs() };
  },
});
