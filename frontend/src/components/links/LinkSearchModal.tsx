import React, { useEffect, useRef, useState } from 'react';
import Modal from '../Modal';
import { Search } from 'lucide-react';
import api from '../../utils/api';

interface Result { type: 'task' | 'article'; id: string; title: string; }

interface Props {
  open: boolean;
  targetType: 'task' | 'article';
  excludeId?: string;
  onClose: () => void;
  onPick: (type: 'task' | 'article', id: string) => void;
}

const LinkSearchModal: React.FC<Props> = ({ open, targetType, excludeId, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/api/search', { params: { q: term } });
        const tasks = (r.data.results?.tasks || []).map((x: any) => ({ type: 'task' as const, id: x._id, title: x.title }));
        const articles = (r.data.results?.articles || []).map((x: any) => ({ type: 'article' as const, id: x._id, title: x.title }));
        const all = (targetType === 'task' ? tasks : articles).filter((x) => x.id !== excludeId);
        setResults(all.slice(0, 20));
      } catch { setResults([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, targetType, excludeId]);

  return (
    <Modal open={open} onClose={onClose} title={targetType === 'task' ? 'Связать задачу' : 'Связать статью'}>
      <div className="link-search">
        <div className="link-search-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={targetType === 'task' ? 'Поиск задачи по названию…' : 'Поиск статьи по названию…'}
          />
        </div>
        <div className="link-search-results">
          {loading && <p className="att-empty">Поиск…</p>}
          {!loading && q.trim().length >= 2 && results.length === 0 && <p className="att-empty">Ничего не найдено</p>}
          {results.map((r) => (
            <button key={r.id} type="button" className="link-search-item" onClick={() => onPick(r.type, r.id)}>
              <span className={'linked-badge linked-badge--' + r.type}>{r.type === 'task' ? 'Задача' : 'Статья'}</span>
              <span className="link-search-title">{r.title}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default LinkSearchModal;
