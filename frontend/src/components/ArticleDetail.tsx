import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Article {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await api.get(`/api/articles/${id}`);
      setArticle(response.data.article);
      setEditTitle(response.data.article.title);
      setEditContent(response.data.article.content);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching article:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить статью');
      setLoading(false);
    }
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
      navigate('/knowledge');
    } catch (err) {
      console.error('Error deleting article:', err);
    }
  };

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!article) return <p>Статья не найдена</p>;

  return (
    <div>
      {isEditing ? (
        <div className="card" style={{ border: '1px solid var(--color-primary)' }}>
          <h2 className="page-title" style={{ marginBottom: 'var(--space-md)' }}>Редактирование статьи</h2>
          <div className="form" style={{ maxWidth: 'none' }}>
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
              rows={10}
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
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <h2 className="page-title" style={{ margin: 0 }}>{article.title}</h2>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="button"
                onClick={startEdit}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="button"
                onClick={handleDelete}
                style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-danger)' }}
              >
                Удалить
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{article.content}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
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
      )}
    </div>
  );
};

export default ArticleDetail;