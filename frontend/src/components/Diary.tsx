import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';
import DiaryModal from './DiaryModal';

interface DiaryEntry {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Diary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const openedEntryId = searchParams.get('entry');

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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

  const openEntry = (id: string) => {
    setSearchParams({ entry: id });
  };

  const closeEntryModal = () => {
    setSearchParams({});
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

      <DiaryModal
        entryId={openedEntryId}
        onClose={closeEntryModal}
        onUpdate={fetchEntries}
      />

      {entries.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Записей пока нет</p>
      ) : (
        <div className="diary-grid">
          {entries.map((entry) => (
            <div key={entry._id} className="card" style={{ marginBottom: 0 }}>
              <button
                type="button"
                onClick={() => openEntry(entry._id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>{entry.title}</h3>
                <p className="card-description">{entry.content}</p>
                <p>Дата: {new Date(entry.createdAt).toLocaleDateString('ru-RU')}</p>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Diary;