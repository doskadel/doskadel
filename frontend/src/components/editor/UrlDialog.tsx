import React, { useEffect, useState } from 'react';
import Modal from '../Modal';

interface UrlDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Показать второе поле «Текст ссылки» */
  showText?: boolean;
  initialUrl?: string;
  initialText?: string;
  urlLabel?: string;
  urlPlaceholder?: string;
  textLabel?: string;
  /** Если url пустой — кнопка «Удалить ссылку» (для ссылок). */
  allowRemove?: boolean;
  submitLabel?: string;
  onSubmit: (url: string, text: string) => void;
  onRemove?: () => void;
}

/** Красивый диалог ввода URL (ссылка/картинка). Заменяет window.prompt. */
const UrlDialog: React.FC<UrlDialogProps> = ({
  open, onClose, title, showText, initialUrl, initialText,
  urlLabel, urlPlaceholder, textLabel, allowRemove, submitLabel, onSubmit, onRemove,
}) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '');
      setText(initialText || '');
    }
  }, [open, initialUrl, initialText]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSubmit(url.trim(), text.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="form" onSubmit={submit}>
        <div>
          <label className="input-label" htmlFor="url-input">{urlLabel || 'Адрес (URL)'}</label>
          <input
            id="url-input"
            type="text"
            className="input"
            placeholder={urlPlaceholder || 'https://...'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {showText && (
          <div>
            <label className="input-label" htmlFor="text-input">{textLabel || 'Текст ссылки'}</label>
            <input
              id="text-input"
              type="text"
              className="input"
              placeholder="Подпись (необязательно)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        <div className="url-dialog-actions">
          {allowRemove && onRemove && (
            <button type="button" className="button button--danger-outline" onClick={onRemove}>
              Удалить ссылку
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="button" onClick={onClose} style={{ backgroundColor: 'var(--color-text-muted)' }}>
            Отмена
          </button>
          <button type="submit" className="button">{submitLabel || 'Вставить'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default UrlDialog;
