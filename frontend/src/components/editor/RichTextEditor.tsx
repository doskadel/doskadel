import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, Minus,
  Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Trash2, Rows3, Columns3, Plus,
  AlignLeft, AlignCenter, AlignRight,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Paperclip as PaperclipIcon,
} from 'lucide-react';
import { editorExtensions } from './extensions';
import { normalizeDoc, convertAttachmentLinks } from './normalize';
import ColorPalette from './ColorPalette';
import UrlDialog from './UrlDialog';
import { makeCodeBlock, makeBlockquote } from './blocks';
import { formatCode } from './codeFormat';
import { TextSelection } from '@tiptap/pm/state';

interface RichTextEditorProps {
  value: any;
  onChange: (json: any, markdown: string) => void;
  initialMarkdown?: string;
  placeholder?: string;
  /** Загрузка файла (вложения): возвращает метаданные или null при ошибке. */
  onUploadFile?: (file: File) => Promise<{ id: string; filename: string; mime: string } | null>;
}

const btn = (active: boolean) => 'rte-btn' + (active ? ' rte-btn--active' : '');

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, initialMarkdown, placeholder, onUploadFile }) => {
  const onUploadFileRef = React.useRef(onUploadFile);
  onUploadFileRef.current = onUploadFile;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Загрузить файл и вставить узел в позицию (картинка -> Image, иначе chip).
  const insertFileAt = async (file: File, editor: any, pos?: number) => {
    const fn = onUploadFileRef.current;
    if (!fn) return;
    const meta = await fn(file);
    if (!meta || !editor) return;
    const isImg = (meta.mime || '').startsWith('image/');
    const node = isImg
      ? { type: 'image', attrs: { src: `attachment:${meta.id}`, alt: meta.filename } }
      : { type: 'attachmentChip', attrs: { id: meta.id, filename: meta.filename, mime: meta.mime } };
    const chain = editor.chain().focus();
    if (typeof pos === 'number') chain.insertContentAt(pos, node).run();
    else chain.insertContent(node).run();
  };
  const editor = useEditor({
    extensions: editorExtensions,
    content: value || initialMarkdown || '',
    onCreate: ({ editor }) => {
      // Статья из Markdown (нет contentJson): разбиваем абзацы по hardBreak,
      // чтобы цитата/код применялись к текущей строке, а не ко всему многострочному абзацу.
      if (!value && initialMarkdown) {
        const normalized = convertAttachmentLinks(normalizeDoc(editor.getJSON()));
        // @ts-ignore — TipTap 3 принимает опции вторым аргументом
        editor.commands.setContent(normalized, { emitUpdate: false });
      }
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // @ts-ignore — storage markdown от tiptap-markdown
      const md = editor.storage.markdown.getMarkdown();
      onChange(json, md);
    },
    editorProps: {
      attributes: { class: 'rte-content md-content', 'data-placeholder': placeholder || 'Введите текст...' },
      handleDOMEvents: {
        mousedown: (view, e) => {
          const target = e.target as HTMLElement;
          // Клик по реальному контенту (текст, ячейка, код, картинка) — обычное поведение.
          if (target.closest('p, h1, h2, h3, li, table, td, th, pre, img, hr, blockquote, code')) return false;

          // Клик по пустой области редактора. Определяем блок по вертикали (Y),
          // вставляем пустой абзац ПОСЛЕ него (как в Notion).
          const children = Array.from(view.dom.children) as HTMLElement[];
          if (children.length === 0) return false;
          const y = e.clientY;
          let idx = -1;
          for (let i = 0; i < children.length; i++) {
            const r = children[i].getBoundingClientRect();
            if (y >= r.top && y <= r.bottom) { idx = i; break; }
          }
          if (idx < 0) {
            const last = children[children.length - 1].getBoundingClientRect();
            idx = y > last.bottom ? children.length - 1 : 0;
          }
          let insertAt = 0;
          for (let i = 0; i <= idx && i < view.state.doc.childCount; i++) {
            insertAt += view.state.doc.child(i).nodeSize;
          }
          // Клик в пустоту -> пустой абзац ПОСЛЕ блока + курсор в нём (Notion-style).
          const after = view.state.doc.nodeAt(insertAt);
          if (after && after.type.name === 'paragraph' && after.content.size === 0) {
            view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, insertAt + 1)));
          } else {
            const para = view.state.schema.nodes.paragraph.create();
            const tr = view.state.tr.insert(insertAt, para);
            tr.setSelection(TextSelection.create(tr.doc, insertAt + 1));
            view.dispatch(tr);
          }
          view.focus();
          e.preventDefault();
          return true;
        },
        // Запрещаем нативный drag выделенного текста внутри ячеек таблицы
        // (иначе при выделении текст «утаскивается» в соседнюю ячейку).
        dragstart: (_view, e) => {
          const t = e.target as HTMLElement;
          if (t.closest && t.closest('td,th') && t.tagName !== 'IMG') {
            e.preventDefault();
            return true;
          }
          return false;
        },
      },
      // Клик в пустой области (справа/снизу от блока) -> вставить пустой абзац ПОСЛЕ блока и встать в него (как в Notion).
      // Отдельный handler в handleDOMEvents ниже.
      handlePaste: (view, event) => {
        // Вставка файлов из буфера (картинки и пр.).
        const files = event.clipboardData?.files;
        if (files && files.length > 0 && onUploadFileRef.current) {
          event.preventDefault();
          Array.from(files as unknown as File[]).forEach((f) => insertFileAt(f, editor));
          return true;
        }
        // Внутри блока кода — форматируем JSON/XML при вставке.
        if (!editor || !editor.isActive('codeBlock')) return false;
        const text = event.clipboardData?.getData('text/plain') || '';
        if (!text.trim()) return false;
        const fmt = formatCode(text);
        if (!fmt.lang) return false;
        event.preventDefault();
        editor.chain().focus().insertContent(fmt.code).run();
        return true;
      },
      handleDrop: (view, e, _slice, moved) => {
        // Drag-n-drop файлов из ОС.
        const dt = (e as DragEvent).dataTransfer;
        if (dt && dt.files && dt.files.length > 0 && onUploadFileRef.current) {
          e.preventDefault();
          const posInfo = view.posAtCoords({ left: (e as DragEvent).clientX, top: (e as DragEvent).clientY });
          const pos = posInfo?.pos;
          Array.from(dt.files).forEach((f) => insertFileAt(f, editor, pos));
          return true;
        }
        if (!moved) return false;
        const p = view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (!p) return false;
        const $p = view.state.doc.resolve(p.pos);
        for (let d = $p.depth; d > 0; d--) {
          const n = $p.node(d).type.name;
          if (n === 'tableCell' || n === 'tableHeader') return true;
        }
        return false;
      },
    },
  });

  // Реактивное состояние активных узлов (ререндер при движении курсора).
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor?.isActive('bold') ?? false,
      isItalic: editor?.isActive('italic') ?? false,
      isUnderline: editor?.isActive('underline') ?? false,
      isStrike: editor?.isActive('strike') ?? false,
      h1: editor?.isActive('heading', { level: 1 }) ?? false,
      h2: editor?.isActive('heading', { level: 2 }) ?? false,
      h3: editor?.isActive('heading', { level: 3 }) ?? false,
      bullet: editor?.isActive('bulletList') ?? false,
      ordered: editor?.isActive('orderedList') ?? false,
      task: editor?.isActive('taskList') ?? false,
      quote: editor?.isActive('blockquote') ?? false,
      codeBlock: editor?.isActive('codeBlock') ?? false,
      link: editor?.isActive('link') ?? false,
      inTable: editor?.isActive('table') ?? false,
      alignLeft: editor?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: editor?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: editor?.isActive({ textAlign: 'right' }) ?? false,
      vAlign: editor?.getAttributes('tableCell').verticalAlign || editor?.getAttributes('tableHeader').verticalAlign || null,
      lineHeight: (() => {
        const a = editor?.getAttributes('paragraph').lineHeight ?? editor?.getAttributes('heading').lineHeight;
        return a ? String(a) : '1.5';
      })(),
    }),
  });

  // Сохраняем позицию курсора на mousedown тулбара, чтобы клик по кнопке не сбивал выделение.
  const savedSel = React.useRef<{ from: number; to: number } | null>(null);
  // Отдельно для селекта интервала: выделение на момент клика.
  const selectSel = React.useRef<{ from: number; to: number } | null>(null);
  const onToolbarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editor) {
      const { from, to } = editor.state.selection;
      savedSel.current = { from, to };
    }
  };
  const chain = useCallback(() => {
    if (!editor) return null;
    const sel = savedSel.current;
    if (sel) {
      const max = editor.state.doc.content.size;
      const from = Math.min(sel.from, max);
      const to = Math.min(sel.to, max);
      return editor.chain().focus().setTextSelection({ from, to });
    }
    return editor.chain().focus();
  }, [editor]);

  if (!editor || !state) return null;

  const [urlDialog, setUrlDialog] = useState<null | 'link' | 'image'>(null);
  const [linkSel, setLinkSel] = useState<{ from: number; to: number } | null>(null);

  const setLink = () => {
    const { from, to } = editor.state.selection;
    setLinkSel({ from, to });
    setUrlDialog('link');
  };
  const addImage = () => {
    const { from, to } = editor.state.selection;
    setLinkSel({ from, to });
    setUrlDialog('image');
  };

  const chainWithSel = () => {
    const c = editor.chain().focus();
    if (linkSel) {
      const max = editor.state.doc.content.size;
      c.setTextSelection({ from: Math.min(linkSel.from, max), to: Math.min(linkSel.to, max) });
    }
    return c;
  };

  const handleLinkSubmit = (url: string, text: string) => {
    if (url) {
      const c = chainWithSel();
      if (text) {
        c.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href: url } }] }).run();
      } else {
        c.extendMarkRange('link').setLink({ href: url }).run();
      }
    }
    setUrlDialog(null);
  };

  const handleImageSubmit = (url: string) => {
    if (url) chainWithSel().setImage({ src: url }).run();
    setUrlDialog(null);
  };

  const setVAlign = (v: 'top' | 'middle' | 'bottom') => {
    editor.chain().focus().setCellAttribute('verticalAlign', v).run();
  };



  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" onMouseDown={onToolbarMouseDown}>
        <button type="button" className={btn(state.h1)} onClick={() => chain()?.toggleHeading({ level: 1 }).run()} title="Заголовок 1"><Heading1 size={16} /></button>
        <button type="button" className={btn(state.h2)} onClick={() => chain()?.toggleHeading({ level: 2 }).run()} title="Заголовок 2"><Heading2 size={16} /></button>
        <button type="button" className={btn(state.h3)} onClick={() => chain()?.toggleHeading({ level: 3 }).run()} title="Заголовок 3"><Heading3 size={16} /></button>

        <span className="rte-sep" />
        <button type="button" className={btn(state.isBold)} onClick={() => chain()?.toggleBold().run()} title="Жирный"><Bold size={16} /></button>
        <button type="button" className={btn(state.isItalic)} onClick={() => chain()?.toggleItalic().run()} title="Курсив"><Italic size={16} /></button>
        <button type="button" className={btn(state.isUnderline)} onClick={() => chain()?.toggleUnderline().run()} title="Подчёркнутый"><UnderlineIcon size={16} /></button>
        <button type="button" className={btn(state.isStrike)} onClick={() => chain()?.toggleStrike().run()} title="Зачёркнутый"><Strikethrough size={16} /></button>
        <ColorPalette kind="text" title="Цвет текста" activeColor={editor.getAttributes('textStyle').color || null} onPick={(c) => { if (c === null) chain()?.unsetColor().run(); else chain()?.setColor(c).run(); }} />
        <ColorPalette kind="bg" title="Цвет фона" activeColor={editor.getAttributes('highlight').color || null} onPick={(c) => { if (c === null) chain()?.unsetHighlight().run(); else chain()?.setHighlight({ color: c }).run(); }} />

        <span className="rte-sep" />
        <button type="button" className={btn(state.bullet)} onClick={() => chain()?.toggleBulletList().run()} title="Маркированный список"><List size={16} /></button>
        <button type="button" className={btn(state.ordered)} onClick={() => chain()?.toggleOrderedList().run()} title="Нумерованный список"><ListOrdered size={16} /></button>
        <button type="button" className={btn(state.task)} onClick={() => chain()?.toggleTaskList().run()} title="Чеклист"><ListChecks size={16} /></button>
        <button type="button" className={btn(state.quote)} onClick={() => makeBlockquote(editor)} title="Цитата"><Quote size={16} /></button>
        <button type="button" className={btn(state.codeBlock)} onClick={() => makeCodeBlock(editor)} title="Блок кода"><Code size={16} /></button>
        <button type="button" className={btn(false)} onClick={() => chain()?.setHorizontalRule().run()} title="Разделитель"><Minus size={16} /></button>

        <span className="rte-sep" />
        <button type="button" className={btn(state.alignLeft)} onClick={() => chain()?.setTextAlign('left').run()} title="По левому краю"><AlignLeft size={16} /></button>
        <button type="button" className={btn(state.alignCenter)} onClick={() => chain()?.setTextAlign('center').run()} title="По центру"><AlignCenter size={16} /></button>
        <button type="button" className={btn(state.alignRight)} onClick={() => chain()?.setTextAlign('right').run()} title="По правому краю"><AlignRight size={16} /></button>

        <span className="rte-sep" />
        <select
          className="rte-select"
          title="Межстрочный интервал"
          aria-label="Межстрочный интервал"
          value={(state as any).lineHeight || '1.5'}
          onChange={(e) => {
            const v = e.target.value;
            const sel = selectSel.current;
            const c = editor.chain().focus();
            if (sel) c.setTextSelection({ from: sel.from, to: sel.to });
            c.setBlockLineHeight(parseFloat(v)).run();
            selectSel.current = null;
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const { from, to } = editor.state.selection;
            selectSel.current = { from, to };
          }}
        >
          <option value="1">1.0</option>
          <option value="1.25">1.25</option>
          <option value="1.5">1.5</option>
          <option value="1.75">1.75</option>
          <option value="2">2.0</option>
        </select>

        <span className="rte-sep" />
        <button type="button" className={btn(state.link)} onClick={setLink} title="Ссылка"><LinkIcon size={16} /></button>
        <button type="button" className={btn(false)} onClick={addImage} title="Картинка по ссылке"><ImageIcon size={16} /></button>
        {onUploadFile && (
          <button type="button" className={btn(false)} onClick={() => fileInputRef.current?.click()} title="Прикрепить файл"><PaperclipIcon size={16} /></button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length) {
              Array.from(e.target.files).forEach((f) => insertFileAt(f, editor));
            }
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className={btn(state.inTable)}
          onClick={() => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Вставить таблицу"
        ><TableIcon size={16} /></button>
      </div>

      {state.inTable && (
        <div className="rte-table-bar" role="toolbar" aria-label="Действия с таблицей" onMouseDown={onToolbarMouseDown}>
          <span className="rte-table-hint rte-table-hint--icon"><Rows3 size={14} /> Строка</span>
          <button type="button" className="rte-btn" onClick={() => chain()?.addRowAfter().run()} title="Добавить строку" aria-label="Добавить строку"><Plus size={15} /></button>
          <button type="button" className="rte-btn" onClick={() => chain()?.deleteRow().run()} title="Удалить строку" aria-label="Удалить строку"><Minus size={15} /></button>
          <span className="rte-table-hint rte-table-hint--icon"><Columns3 size={14} /> Столбец</span>
          <button type="button" className="rte-btn" onClick={() => chain()?.addColumnAfter().run()} title="Добавить столбец" aria-label="Добавить столбец"><Plus size={15} /></button>
          <button type="button" className="rte-btn" onClick={() => chain()?.deleteColumn().run()} title="Удалить столбец" aria-label="Удалить столбец"><Minus size={15} /></button>
          <span className="rte-sep" />
          <span className="rte-table-hint">По вертикали:</span>
          <button type="button" className={btn((state as any).vAlign === 'top')} onClick={() => setVAlign('top')} title="Сверху" aria-label="Выровнять сверху"><AlignVerticalJustifyStart size={15} /></button>
          <button type="button" className={btn((state as any).vAlign === 'middle')} onClick={() => setVAlign('middle')} title="По центру" aria-label="Выровнять по центру"><AlignVerticalJustifyCenter size={15} /></button>
          <button type="button" className={btn((state as any).vAlign === 'bottom')} onClick={() => setVAlign('bottom')} title="Снизу" aria-label="Выровнять снизу"><AlignVerticalJustifyEnd size={15} /></button>
          <button type="button" className="rte-btn rte-btn--danger" onClick={() => chain()?.deleteTable().run()} title="Удалить таблицу"><Trash2 size={15} /></button>
        </div>
      )}

      <EditorContent editor={editor} className="rte-editor" />

      <UrlDialog
        open={urlDialog === 'link'}
        onClose={() => setUrlDialog(null)}
        title="Ссылка"
        showText
        initialUrl={editor.getAttributes('link').href || ''}
        urlLabel="Адрес ссылки"
        textLabel="Текст ссылки"
        allowRemove={editor.isActive('link')}
        submitLabel="Вставить"
        onSubmit={handleLinkSubmit}
        onRemove={() => { chainWithSel().extendMarkRange('link').unsetLink().run(); setUrlDialog(null); }}
      />
      <UrlDialog
        open={urlDialog === 'image'}
        onClose={() => setUrlDialog(null)}
        title="Картинка по ссылке"
        initialUrl=""
        urlLabel="Адрес картинки"
        urlPlaceholder="https://.../image.png"
        submitLabel="Вставить"
        onSubmit={handleImageSubmit}
      />
    </div>
  );
};

export default RichTextEditor;
