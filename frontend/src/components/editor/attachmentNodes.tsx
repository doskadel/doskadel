import React from 'react';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useAttachmentUrl, parseAttachmentId } from '../../utils/attachments';
import { FileText } from 'lucide-react';
import AttachmentViewer from '../attachments/AttachmentViewer';

/** Картинка с src='attachment:<id>' — грузим blob через хук (Authorization). */
const AttachmentImage: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const src: string = node.attrs.src || '';
  const attId = parseAttachmentId(src);
  const { url, loading, error } = useAttachmentUrl(attId);
  const width: number | null = node.attrs.width || null;
  const imgRef = React.useRef<HTMLImageElement>(null);
  const startRef = React.useRef<{ x: number; w: number } | null>(null);

  const startYRef = React.useRef<{ y: number; h: number } | null>(null);
  const onResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = imgRef.current?.getBoundingClientRect();
    startRef.current = { x: e.clientX, w: rect?.width || width || 300 };
    startYRef.current = { y: e.clientY, h: rect?.height || 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    e.preventDefault();
    // Учитываем и горизонталь, и вертикаль (тянуть за угол наискосок).
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - (startYRef.current?.y || e.clientY);
    const delta = Math.abs(dy) > Math.abs(dx) ? dy : dx;
    const next = Math.max(40, Math.round(startRef.current.w + delta));
    updateAttributes({ width: next });
  };
  const onResizeUp = () => { startRef.current = null; startYRef.current = null; };

  const style = width ? { width: `${width}px`, maxWidth: '100%' } : undefined;
  return (
    <NodeViewWrapper as="span" className={'att-inline-img' + (selected ? ' att-inline-img--selected' : '')} style={{ display: 'inline-block', position: 'relative' }}>
      {attId ? (
        url ? <img ref={imgRef} src={url} alt={node.attrs.alt || ''} draggable={false} style={style} />
          : <span className="att-inline-ph">{loading ? '…' : (error ? '⚠ файл недоступен' : '')}</span>
      ) : (
        <img ref={imgRef} src={src} alt={node.attrs.alt || ''} draggable={false} style={style} />
      )}
      <span
        className="att-resize-handle"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        title="Изменить размер"
      />
    </NodeViewWrapper>
  );
};

export const AttachmentImageExt = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const w = el.getAttribute('width') || el.style.width;
          return w ? parseInt(w, 10) || null : null;
        },
        renderHTML: (attrs: any) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentImage);
  },
});

/** Inline-чип для не-картинки: [filename](attachment:id). */
const ChipView: React.FC<NodeViewProps> = ({ node }) => {
  const attId = node.attrs.id as string;
  const filename = node.attrs.filename as string;
  const mime = node.attrs.mime as string;
  const { error } = useAttachmentUrl(attId);
  const deleted = error;
  const [open, setOpen] = React.useState(false);
  const onClick = () => { if (!deleted) setOpen(true); };
  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        className={'attachment-chip' + (deleted ? ' attachment-chip--deleted' : '')}
        onClick={deleted ? undefined : onClick}
        title={deleted ? filename : `Открыть: ${filename}`}
        data-attachment-id={attId}
      >
        <FileText size={13} /> {deleted ? `${filename} (удалён)` : filename}
      </span>
      {open && (
        <AttachmentViewer att={{ _id: attId, filename, mime }} onClose={() => setOpen(false)} />
      )}
    </NodeViewWrapper>
  );
};

export const AttachmentChip = Node.create({
  name: 'attachmentChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null },
      filename: { default: '' },
      mime: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'a[data-attachment-id]', getAttrs: (el: any) => ({ id: (el as HTMLElement).getAttribute('data-attachment-id'), filename: (el as HTMLElement).textContent || '', mime: '' }) }];
  },
  renderHTML({ node }: any) {
    return ['a', mergeAttributes({ 'data-attachment-id': node.attrs.id, 'data-mime': node.attrs.mime || '', class: 'attachment-chip', href: `attachment:${node.attrs.id}` }), node.attrs.filename || 'файл'];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChipView);
  },
  // tiptap-markdown сериализация: [filename](attachment:id)
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`[${node.attrs.filename || 'файл'}](attachment:${node.attrs.id})`);
        },
        parse: {
          // markdown-it не распознаёт attachment: как ссылку — подхватим на уровне markdown-it plugin не будем,
          // обратный парсинг при открытии статьи делаем через normalize (см. attachmentParse).
        },
      },
    };
  },
});
