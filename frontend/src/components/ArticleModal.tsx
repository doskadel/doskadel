import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';

interface Article {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ArticleModalProps {
  articleId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ articleId, onClose, onUpdate }) => {
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setIsEditing(false);
      setLinkCopied(false);
      return;
    }
    fetchArticle(articleId);
  }, [articleId]);

  const fetchArticle = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/articles/${id}`);
      const a = response.data.article;
      setArticle(a);
      setEditTitle(a.title);
      setEditContent(a.content);
    } catch (err: any) {
      console.error('Error fetching article:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить статью');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const startEdit = () => {
    if (!article) return;
    setEditTitle(article.title);
    setEditContent(article.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!article) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/articles/${article._id}`, {
        title: editTitle,
        content: editContent,
      });
      setArticle(response.data.article);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating article:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!window.confirm('Удалить статью?')) return;
    try {
      await api.delete(`/api/articles/${article._id}`);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting article:', err);
    }
  };

  const handleCopyLink = async () => {
    if (!article) return;
    const url = `${window.location.origin}/knowledge?article=${article._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openFullPage = () => {
    if (!article) return;
    onClose();
    navigate(`/knowledge/${article._id}`);
  };

  const modalTitle = isEditing ? 'Редактирование статьи' : (article?.title || '');

  const rail = article && !loading && !error ? (
    <>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={handleCopyLink}
        title={linkCopied ? 'Скопировано!' : 'Копировать ссылку'}
        aria-label="Копировать ссылку"
      >
        {linkCopied ? '✓' : '🔗'}
      </button>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={startEdit}
        title="Редактировать"
        aria-label="Редактировать"
        disabled={isEditing}
      >
        ✏️
      </button>
      <button
        type="button"
        className="modal-rail-btn modal-rail-btn--danger"
        onClick={handleDelete}
        title="Удалить"
        aria-label="Удалить"
      >
        🗑️
      </button>
    </>
  ) : null;

  return (
    <Modal open={!!articleId} onClose={handleClose} title={modalTitle} wide rightRail={rail}>
      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {article && !loading && !error && (
        <>
          {isEditing ? (
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
                  onClick={cancelEdit}
                  style={{ backgroundColor: 'var(--color-text-muted)' }}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={saveEdit}
                  disabled={saving || !editTitle.trim() || !editContent.trim()}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: 'var(--color-text)', margin: 0 }}>{article.content}</p>
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

              <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={openFullPage}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                >
                  Открыть полностью →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ArticleModal;