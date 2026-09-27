import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';

interface DiaryEntry {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DiaryModalProps {
  entryId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const DiaryModal: React.FC<DiaryModalProps> = ({ entryId, onClose, onUpdate }) => {
  const navigate = useNavigate();

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setIsEditing(false);
      setLinkCopied(false);
      return;
    }
    fetchEntry(entryId);
  }, [entryId]);

  const fetchEntry = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/diary/${id}`);
      const e = response.data.diaryEntry;
      setEntry(e);
      setEditTitle(e.title);
      setEditContent(e.content);
    } catch (err: any) {
      console.error('Error fetching entry:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить запись');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const startEdit = () => {
    if (!entry) return;
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/diary/${entry._id}`, {
        title: editTitle,
        content: editContent,
      });
      setEntry(response.data.diaryEntry);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating entry:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/api/diary/${entry._id}`);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const handleCopyLink = async () => {
    if (!entry) return;
    const url = `${window.location.origin}/diary?entry=${entry._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openFullPage = () => {
    if (!entry) return;
    onClose();
    navigate(`/diary/${entry._id}`);
  };

  const modalTitle = isEditing ? 'Редактирование записи' : (entry?.title || '');

  const rail = entry && !loading && !error ? (
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
    <Modal open={!!entryId} onClose={handleClose} title={modalTitle} wide rightRail={rail}>
      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {entry && !loading && !error && (
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
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: 'var(--color-text)', margin: 0 }}>{entry.content}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Создано</p>
                  <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(entry.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Обновлено</p>
                  <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(entry.updatedAt).toLocaleString('ru-RU')}</p>
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

export default DiaryModal;