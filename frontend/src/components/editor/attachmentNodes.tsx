import React from 'react';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useAttachmentUrl, parseAttachmentId } from '../../utils/attachments';
import { FileText } from 'lucide-react';

/** Картинка с src='attachment:<id>' — грузим blob через хук (Authorization). */
const AttachmentImage: React.FC<NodeViewProps> = ({ node }) => {
  const src: string = node.attrs.src || '';
  const attId = parseAttachmentId(src);
  const { url, loading, error } = useAttachmentUrl(attId);
  return (
    <NodeViewWrapper as="span" className="att-inline-img" style={{ display: 'inline-block' }}>
      {attId ? (
        url ? <img src={url} alt={node.attrs.alt || ''} draggable={false} />
          : <span className="att-inline-ph">{loading ? '…' : (error ? '⚠ файл недоступен' : '')}</span>
      ) : (
        <img src={src} alt={node.attrs.alt || ''} draggable={false} />
      )}
    </NodeViewWrapper>
  );
};

export const AttachmentImageExt = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentImage);
  },
});

/** Inline-чип для не-картинки: [filename](attachment:id). */
const ChipView: React.FC<NodeViewProps> = ({ node }) => {
  const attId = node.attrs.id as string;
  const filename = node.attrs.filename as string;
  const { url, error } = useAttachmentUrl(attId);
  const deleted = error;
  const onClick = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        className={'attachment-chip' + (deleted ? ' attachment-chip--deleted' : '')}
        onClick={deleted ? undefined : onClick}
        title={filename}
        data-attachment-id={attId}
      >
        <FileText size={13} /> {deleted ? `${filename} (удалён)` : filename}
      </span>
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
    return ['a', mergeAttributes({ 'data-attachment-id': node.attrs.id, class: 'attachment-chip', href: `attachment:${node.attrs.id}` }), node.attrs.filename || 'файл'];
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
