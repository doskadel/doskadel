import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface SearchResult {
  _id: string;
  title: string;
  description: string;
  type: 'task' | 'article';
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/search?q=${encodeURIComponent(query)}`);

      const { tasks, articles } = response.data.results;
      setResults([
        ...tasks.map((t: any) => ({ ...t, type: 'task' as const })),
        ...articles.map((a: any) => ({ ...a, description: a.content, type: 'article' as const }))
      ]);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openResult = (result: SearchResult) => {
    if (result.type === 'task') {
      navigate(`/tasks?task=${result._id}`);
    } else {
      navigate(`/knowledge?article=${result._id}`);
    }
  };

  return (
    <div>
      <h2 className="page-title">Поиск</h2>
      <div className="form-wrapper">
        <form onSubmit={handleSearch} className="form">
          <input
            type="text"
            placeholder="Поиск по задачам и базе знаний..."
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
            <div
              key={result._id}
              className="card"
              style={{ marginBottom: '10px', cursor: 'pointer' }}
              onClick={() => openResult(result)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openResult(result);
              }}
            >
              <h4>{result.title}</h4>
              <p>{result.description}</p>
              <p>Тип: {result.type === 'task' ? 'Задача' : 'Статья'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;