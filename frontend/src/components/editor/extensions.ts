import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { VerticalAlignTableCell, VerticalAlignTableHeader } from './VerticalAlignTableCell';
import { RowHeightTableRow } from './RowHeightTableRow';
import { rowResizePlugin } from './rowResizePlugin';

import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { BlockLineHeight } from './LineHeight';
import Highlight from '@tiptap/extension-highlight';
import { Markdown } from 'tiptap-markdown';

import { Extension, Extensions } from '@tiptap/core';

/**
 * Единый набор расширений TipTap для DoskaDel.
 * Используется и в редакторе, и при рендере (generateHTML).
 * Только MIT-расширения (см. ADR 2026-10-16).
 */
export const editorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
    hardBreak: false,
  }),
  Image,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({
    types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  BlockLineHeight,
  Table.configure({
    resizable: true,
    lastColumnResizable: true,
    cellMinWidth: 60,
    handleWidth: 6,
  }),
  RowHeightTableRow,
  VerticalAlignTableHeader,
  VerticalAlignTableCell,
  Markdown.configure({ html: false, tightLists: true, linkify: true, breaks: true }),
  // Плагин resize высоты строк таблицы
  Extension.create({
    name: 'rowResize',
    addProseMirrorPlugins() {
      return [rowResizePlugin];
    },
  }),
];

