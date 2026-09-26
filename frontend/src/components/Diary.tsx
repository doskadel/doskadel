import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/diary', {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/diary', {
        title,
        content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTitle('');
      setContent('');
      fetchEntries();
    } catch (err) {
      console.error('Error creating diary entry:', err);
    }
  };

  if (loading) return <p>Loading entries...</p>;

  return (
    <div>
      <h2>Diary</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          required
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input"
          rows={5}
          required
        />
        <button type="submit" className="button">Add Entry</button>
      </form>

      <div style={{ marginTop: '20px' }}>
        {entries.map((entry) => (
          <div key={entry._id} className="card" style={{ marginBottom: '10px' }}>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
            <p>Date: {new Date(entry.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Diary;