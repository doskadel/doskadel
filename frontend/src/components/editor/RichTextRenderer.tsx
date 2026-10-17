import React from 'react';
import { generateHTML } from '@tiptap/core';
import DOMPurify from 'dompurify';
import { editorExtensions } from './extensions';
import MarkdownRenderer from '../MarkdownRenderer';

interface RichTextRendererProps {
  /** JSON TipTap (источник правды) */
  contentJson?: any;
  /** Markdown (для старых статей, format='md') */
  markdown?: string;
  className?: string;
}

/**
 * Рендер контента статьи:
 * - если есть contentJson -> generateHTML + DOMPurify (безопасно);
 * - иначе -> MarkdownRenderer (старые статьи).
 */
const RichTextRenderer: React.FC<RichTextRendererProps> = ({ contentJson, markdown, className }) => {
  if (contentJson) {
    let html = '';
    try {
      html = generateHTML(contentJson, editorExtensions);
    } catch (e) {
      console.error('[RICH] generateHTML failed:', e);
      html = '';
    }
    const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['data-valign', 'data-row-height'] });
    return (
      <div
        className={'md-content' + (className ? ' ' + className : '')}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return <MarkdownRenderer content={markdown || ''} className={className} />;
};

export default RichTextRenderer;
