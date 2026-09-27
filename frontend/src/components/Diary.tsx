import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface DiaryEntry {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Diary: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/diary', { title, content });
      setTitle('');
      setContent('');
      fetchEntries();
    } catch (err) {
      console.error('Error creating diary entry:', err);
    }
  };

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry._id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await api.put(`/api/diary/${id}`, {
        title: editTitle,
        content: editContent,
      });
      setEditingId(null);
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
      <h2 className="page-title">Дневник</h2>

      <div className="form-wrapper">
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
          <textarea
            placeholder="Содержимое"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input"
            rows={5}
            required
          />
          <button type="submit" className="button">Добавить запись</button>
        </form>
      </div>

      <h3 className="list-title">Записи</h3>
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
                <div style={{ flex: 1 }}>
                  <h3>{entry.title}</h3>
                  <p>{entry.content}</p>
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