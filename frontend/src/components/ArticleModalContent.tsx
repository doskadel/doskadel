import React from 'react';
import { Article } from '../hooks/useArticleDetail';

interface ArticleModalContentProps {
  article: Article | null;
  loading: boolean;
  error: string;

  isEditing: boolean;
  editTitle: string;
  editContent: string;
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditContent: (v: string) => void;

  onSave: () => void;
  onCancel: () => void;
}

const ArticleModalContent: React.FC<ArticleModalContentProps> = ({
  article,
  loading,
  error,
  isEditing,
  editTitle,
  editContent,
  saving,
  setEditTitle,
  setEditContent,
  onSave,
  onCancel,
}) => {
  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (error) {
    return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  }

  if (!article) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="form" style={{ maxWidth: '100%', margin: 0 }}>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="input"
          placeholder="Заголовок"
          required
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="input"
          rows={12}
          placeholder="Содержимое"
          required
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="button"
            onClick={onCancel}
            style={{ backgroundColor: 'var(--color-text-muted)' }}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="button"
            onClick={onSave}
            disabled={saving || !editTitle.trim() || !editContent.trim()}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: 'var(--color-text)', margin: 0 }}>
          {article.content}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Создано</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(article.createdAt).toLocaleString('ru-RU')}</p>
        </div>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Обновлено</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(article.updatedAt).toLocaleString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
};

export default ArticleModalContent;