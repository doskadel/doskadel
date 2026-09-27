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
        {entries.map((entry) => (
          <div key={entry._id} className="card" style={{ marginBottom: '10px' }}>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
            <p>Дата: {new Date(entry.createdAt).toLocaleDateString('ru-RU')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Diary;
