import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';
import DiaryModal from './DiaryModal';
import DiaryFilterBar from './DiaryFilterBar';

interface DiaryEntry {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Diary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const openedEntryId = searchParams.get('entry');
  const q = searchParams.get('q') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) {
        updateQuery({ q: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchEntries();
  }, [q, dateFrom, dateTo]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const url = '/api/diary' + (params.toString() ? '?' + params.toString() : '');
      const response = await api.get(url);
      setEntries(response.data.diaryEntries);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching diary entries:', err);
      setLoading(false);
    }
  };

  const openEntry = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('entry', id);
    setSearchParams(next);
  };

  const closeEntryModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('entry');
    setSearchParams(next);
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

  const handleResetFilters = () => {
    updateQuery({ q: null, dateFrom: null, dateTo: null });
    setSearchInput('');
  };

  const handleDateFromChange = (value: string) => {
    if (value && dateTo && value > dateTo) return;
    updateQuery({ dateFrom: value || null });
  };

  const handleDateToChange = (value: string) => {
    if (value && dateFrom && value < dateFrom) return;
    updateQuery({ dateTo: value || null });
  };

  const dateError = (() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return 'Дата «По» не может быть раньше даты «С»';
    }
    return '';
  })();

  const hasActiveFilters = !!(q || dateFrom || dateTo);

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

      <DiaryFilterBar
        q={searchInput}
        onQChange={setSearchInput}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        dateError={dateError}
      />

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

      {entries.length === 0 && hasActiveFilters && (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
          Ничего не найдено по вашим фильтрам
        </p>
      )}

      {entries.length === 0 && !hasActiveFilters && (
        <p style={{ color: 'var(--color-text-muted)' }}>Записей пока нет</p>
      )}

      {entries.length > 0 && (
        <div className="diary-grid">
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="diary-card"
              onClick={() => openEntry(entry._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openEntry(entry._id);
              }}
            >
              <h3 className="diary-card-title">{entry.title}</h3>
              <p className="diary-card-description">{entry.content}</p>
              <div className="diary-card-meta">
                Создано: {new Date(entry.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Diary;