import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { generateHTML } from '@tiptap/core';
import DOMPurify from 'dompurify';
import { editorExtensions } from './extensions';
import { lowlight } from './lowlight';
import { formatCode } from './codeFormat';
import MarkdownRenderer from '../MarkdownRenderer';
import { useAttachmentUrl, parseAttachmentId, AttachmentMeta } from '../../utils/attachments';
import api from '../../utils/api';

// Компонент-картинка для режима просмотра: attachment:<id> -> blob.
const RenderedAttachmentImage: React.FC<{ attId: string; alt?: string }> = ({ attId, alt }) => {
  const { url, loading, error } = useAttachmentUrl(attId);
  if (url) return <img src={url} alt={alt || ''} />;
  return <span className="att-inline-ph">{loading ? '…' : (error ? '⚠ файл недоступен' : '')}</span>;
};

// Чип не-картинки для просмотра.
const RenderedAttachmentChip: React.FC<{ attId: string; filename: string }> = ({ attId, filename }) => {
  const { url, error } = useAttachmentUrl(attId);
  const deleted = error;
  const onClick = () => {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = filename || 'file'; document.body.appendChild(a); a.click(); a.remove();
  };
  return (
    <span className={'attachment-chip' + (deleted ? ' attachment-chip--deleted' : '')} onClick={deleted ? undefined : onClick} title={filename}>
      {deleted ? `${filename} (удалён)` : filename}
    </span>
  );
};

interface RichTextRendererProps {
  contentJson?: any;
  markdown?: string;
  className?: string;
}

const COPY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// hast (lowlight) -> HTML строка со span-классами hljs-*
const hastToHtml = (node: any): string => {
  if (node.type === 'text') return escapeHtml(node.value || '');
  if (node.type === 'element') {
    const cls = (node.properties && node.properties.className) ? node.properties.className.join(' ') : '';
    const inner = (node.children || []).map(hastToHtml).join('');
    return `<span${cls ? ` class="${cls}"` : ''}>${inner}</span>`;
  }
  if (node.type === 'root') return (node.children || []).map(hastToHtml).join('');
  return '';
};

/** Простая эвристика для подписи языка в шапке код-блока. */
const guessLang = (text: string): string => {
  const t = text.trim();
  if (!t) return 'code';
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<?xml')) return 'xml';
  if (t.startsWith('<')) return 'html';
  if (t.startsWith('#!') || t.startsWith('$ ')) return 'bash';
  if (/\b(function|const|let|var|=>|import|export)\b/.test(t)) return 'javascript';
  if (/\b(def |class |import )/.test(t) && t.includes(':')) return 'python';
  return 'code';
};

/**
 * Рендер контента статьи:
 * - contentJson -> generateHTML + DOMPurify + подсветка кода и шапка с копированием;
 * - иначе Markdown.
 */
const RichTextRenderer: React.FC<RichTextRendererProps> = ({ contentJson, markdown, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!contentJson) { setHtml(''); return; }
    let raw = '';
    try { raw = generateHTML(contentJson, editorExtensions); } catch (e) { console.error('[RICH] generateHTML failed:', e); }
    const clean = DOMPurify.sanitize(raw, {
      ADD_ATTR: ['data-valign', 'data-row-height', 'style', 'data-color', 'data-attachment-id'],
      ADD_URI_SAFE_ATTR: ['src', 'href'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|attachment):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
    setHtml(clean);
  }, [contentJson]);

  useEffect(() => {
    const root = ref.current;
    if (!root || !html) return;
    const codes = root.querySelectorAll('pre > code');
    codes.forEach((codeEl) => {
      const pre = codeEl.parentElement;
      if (!pre || (pre.parentElement && pre.parentElement.classList.contains('code-block'))) return;
      const raw = codeEl.textContent || '';
      const fmt = formatCode(raw);
      const text = fmt.code;
      let highlighted = '';
      try {
        highlighted = hastToHtml(lowlight.highlightAuto(text));
      } catch { highlighted = escapeHtml(text); }
      codeEl.innerHTML = highlighted;
      codeEl.classList.add('hljs');
      const lang = fmt.lang || guessLang(text);
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `<span class="code-block-lang">${escapeHtml(lang)}</span>`
        + `<button type="button" class="code-block-copy" aria-label="Копировать код" title="Копировать">${COPY_ICON}</button>`;
      pre.parentElement?.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });

    // Attachment-узлы: заменяем на React-корни с хуком useAttachmentUrl.
    const roots: Root[] = [];
    root.querySelectorAll('img[src^="attachment:"]').forEach((img) => {
      const id = parseAttachmentId(img.getAttribute('src'));
      if (!id) return;
      const holder = document.createElement('span');
      img.replaceWith(holder);
      const r = createRoot(holder);
      r.render(<RenderedAttachmentImage attId={id} alt={img.getAttribute('alt') || ''} />);
      roots.push(r);
    });
    root.querySelectorAll('a[data-attachment-id]').forEach((a) => {
      const id = a.getAttribute('data-attachment-id');
      if (!id) return;
      const holder = document.createElement('span');
      a.replaceWith(holder);
      const r = createRoot(holder);
      r.render(<RenderedAttachmentChip attId={id} filename={(a.textContent || 'файл')} />);
      roots.push(r);
    });

    return () => { roots.forEach((r) => r.unmount()); };
  }, [html]);

  const onClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.code-block-copy') as HTMLElement | null;
    if (!btn) return;
    const wrapper = btn.closest('.code-block');
    const code = wrapper?.querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent || '').then(() => {
      btn.innerHTML = CHECK_ICON;
      setTimeout(() => { btn.innerHTML = COPY_ICON; }, 1500);
    }).catch(() => {});
  };

  if (contentJson) {
    return (
      <div
        ref={ref}
        className={'md-content rte-render' + (className ? ' ' + className : '')}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={onClick}
      />
    );
  }
  return <MarkdownRenderer content={markdown || ''} className={className} />;
};

export default RichTextRenderer;
