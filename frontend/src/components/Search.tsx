import React, { useState } from 'react';
import axios from 'axios';
import { getToken } from '../utils/token';

interface SearchResult {
  _id: string;
  title: string;
  description: string;
  type: 'task' | 'diary';
}

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const token = getToken();
      const response = await axios.get(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { tasks, diaryEntries } = response.data.results;
      setResults([
        ...tasks.map((t: any) => ({ ...t, type: 'task' as const })),
        ...diaryEntries.map((d: any) => ({ ...d, description: d.content, type: 'diary' as const }))
      ]);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Поиск</h2>
        <div className="form-wrapper">
        <form onSubmit={handleSearch} className="form">
          <input
            type="text"
            placeholder="Поиск по задачам и дневнику..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input"
          />
          <button type="submit" className="button">Найти</button>
        </form>
        </div>

      {loading && <p>Поиск...</p>}
      
      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Результаты:</h3>
          {results.map((result) => (
            <div key={result._id} className="card" style={{ marginBottom: '10px' }}>
              <h4>{result.title}</h4>
              <p>{result.description}</p>
              <p>Тип: {result.type === 'task' ? 'Задача' : 'Запись'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;