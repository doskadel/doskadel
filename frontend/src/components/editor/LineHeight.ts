import { Extension } from '@tiptap/core';

/**
 * Межстрочный интервал для блочных узлов (параграф, заголовки).
 * lineHeight: 1 | 1.15 | 1.5 | 2 (число).
 */
export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return { types: ['paragraph', 'heading'], defaultHeight: 1 };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (attrs: Record<string, any>) => {
              if (attrs.lineHeight == null) return {};
              const lh = Number(attrs.lineHeight);
              // Отступ между абзацами масштабируется вместе с интервалом
              // (иначе при Enter расстояние остаётся фиксированным).
              const margin = Math.round(9.7 * lh * 10) / 10;
              return { style: `line-height: ${lh}; margin-bottom: ${margin}px` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value: number | null) =>
        ({ state, tr, dispatch }: any) => {
          const { from, to, empty } = state.selection;
          const types = this.options.types;
          let modified = 0;
          if (empty) {
            // Курсор без выделения: меняем ТОЛЬКО блок под курсором.
            const $from = state.doc.resolve(from);
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (types.includes(node.type.name)) {
                const pos = $from.before(d);
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: value });
                modified++;
                break;
              }
            }
          } else {
            // Выделение: меняем только блоки в выделенном диапазоне.
            state.doc.nodesBetween(from, to, (node: any, pos: number) => {
              if (types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: value });
                modified++;
              }
            });
          }
          if (modified > 0 && dispatch) dispatch(tr);
          return modified > 0;
        },
    } as any;
  },
});

// Типы для TS
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (value: number | null) => ReturnType;
    };
  }
}
