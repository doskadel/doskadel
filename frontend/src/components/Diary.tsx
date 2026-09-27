import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from './Modal';

interface DiaryEntry {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Diary: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [originalEntry, setOriginalEntry] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await api.get('/api/diary');
      setEntries(response.data.diaryEntries);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching diary entries:', err);
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setContent('');
  };

  const isCreateFormDirty = (): boolean => {
    return title.trim() !== '' || content.trim() !== '';
  };

  const handleCloseCreate = () => {
    if (isCreateFormDirty()) {
      if (!window.confirm('Есть несохранённые данные. Закрыть?')) return;
    }
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/diary', { title, content });
      resetCreateForm();
      setCreateOpen(false);
      fetchEntries();
    } catch (err) {
      console.error('Error creating diary entry:', err);
    }
  };

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry._id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setOriginalEntry(entry);
  };

  const isEditFormDirty = (): boolean => {
    if (!originalEntry) return false;
    return editTitle !== originalEntry.title || editContent !== originalEntry.content;
  };

  const cancelEdit = () => {
    if (isEditFormDirty()) {
      if (!window.confirm('Есть несохранённые изменения. Отменить?')) return;
    }
    setEditingId(null);
    setOriginalEntry(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await api.put(`/api/diary/${id}`, {
        title: editTitle,
        content: editContent,
      });
      setEditingId(null);
      setOriginalEntry(null);
      fetchEntries();
    } catch (err) {
      console.error('Error updating diary entry:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/api/diary/${id}`);
      fetchEntries();
    } catch (err) {
      console.error('Error deleting diary entry:', err);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Дневник</h2>
        <button
          type="button"
          className="button"
          onClick={() => setCreateOpen(true)}
        >
          + Добавить запись
        </button>
      </div>

      <Modal open={createOpen} onClose={handleCloseCreate} title="Новая запись">
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
            autoFocus
          />
          <textarea
            placeholder="Содержимое"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input"
            rows={8}
            required
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              className="button"
              onClick={handleCloseCreate}
              style={{ backgroundColor: 'var(--color-text-muted)' }}
            >
              Отмена
            </button>
            <button type="submit" className="button">Создать</button>
          </div>
        </form>
      </Modal>

      <div>
        {entries.map((entry) => {
          const isEditing = editingId === entry._id;

          if (isEditing) {
            return (
              <div
                key={entry._id}
                className="card"
                style={{ marginBottom: '10px', border: '1px solid var(--color-primary)' }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  style={{ marginBottom: '8px', fontWeight: 600 }}
                  required
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="input"
                  rows={5}
                  style={{ marginBottom: '8px' }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button"
                    onClick={cancelEdit}
                    style={{ backgroundColor: 'var(--color-text-muted)' }}
                    disabled={savingEdit}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => saveEdit(entry._id)}
                    disabled={savingEdit || !editTitle.trim() || !editContent.trim()}
                  >
                    {savingEdit ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={entry._id} className="card" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ marginBottom: 'var(--space-sm)' }}>{entry.title}</h3>
                  <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{entry.content}</p>
                  <p>Дата: {new Date(entry.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="button"
                    onClick={() => startEdit(entry)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => handleDelete(entry._id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-danger)',
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Diary;