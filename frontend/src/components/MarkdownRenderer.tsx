import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Рендер Markdown (GFM: таблицы, чеклисты, ссылки). Безопасен по умолчанию:
 * react-markdown не рендерит произвольный HTML (raw HTML игнорируется).
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  if (!content || !content.trim()) {
    return <p className="md-empty">Нет содержимого</p>;
  }
  return (
    <div className={'md-content' + (className ? ' ' + className : '')}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
