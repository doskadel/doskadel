import React, { useState } from 'react';
import axios from 'axios';

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
      const token = localStorage.getItem('token');
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
      <h2>Search</h2>
      <form onSubmit={handleSearch} className="form">
        <input
          type="text"
          placeholder="Search tasks and diary entries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
        />
        <button type="submit" className="button">Search</button>
      </form>

      {loading && <p>Searching...</p>}
      
      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Results:</h3>
          {results.map((result) => (
            <div key={result._id} className="card" style={{ marginBottom: '10px' }}>
              <h4>{result.title}</h4>
              <p>{result.description}</p>
              <p>Type: {result.type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;