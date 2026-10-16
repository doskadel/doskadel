import React, { useEffect, useState } from 'react';
import MDEditor, {
  title1, title2, title3,
  bold, italic, strikethrough,
  quote, code, codeBlock,
  link, image,
  unorderedListCommand, orderedListCommand, checkedListCommand,
  table, hr, divider,
} from '@uiw/react-md-editor';
import { useTheme } from '../hooks/useTheme';
import MarkdownRenderer from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  height?: number;
}

// Наш тулбар: заголовки, форматирование, списки, ТАБЛИЦА, ссылки, картинки, код.
const toolbarCommands = [
  title1, title2, title3,
  divider,
  bold, italic, strikethrough,
  divider,
  unorderedListCommand, orderedListCommand, checkedListCommand,
  divider,
  table, hr,
  divider,
  quote, code, codeBlock,
  divider,
  link, image,
];

/**
 * Markdown-редактор. По умолчанию — только редактор на всю ширину.
 * Кнопка «Просмотр» показывает отрендеренный результат.
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, placeholder, height = 360 }) => {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="md-editor-wrap">
      <div className="md-editor-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'edit'}
          className={'md-editor-tab' + (mode === 'edit' ? ' md-editor-tab--active' : '')}
          onClick={() => setMode('edit')}
        >
          Редактор
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'preview'}
          className={'md-editor-tab' + (mode === 'preview' ? ' md-editor-tab--active' : '')}
          onClick={() => setMode('preview')}
        >
          Просмотр
        </button>
      </div>

      {mode === 'edit' ? (
        <div className="md-editor" data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
          <MDEditor
            value={value}
            onChange={(v) => onChange(v ?? '')}
            preview="edit"
            height={height}
            commands={toolbarCommands}
            extraCommands={[]}
            textareaProps={{ placeholder: placeholder || 'Текст в формате Markdown...' }}
            visibleDragbar={false}
          />
        </div>
      ) : (
        <div className="md-preview-box" style={{ minHeight: height }}>
          <MarkdownRenderer content={value} />
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
