import React, { useEffect, useState } from 'react';
import { Link2, X, Plus, Search } from 'lucide-react';
import api from '../../utils/api';
import { LinkedEntity, listLinks, createLink, deleteLink } from '../../utils/links';
import { useToast } from '../Toast';

interface Props {
  ownerType: 'task' | 'article';
  ownerId: string;
  onOpen?: (type: 'task' | 'article', id: string) => void;
  readOnly?: boolean;
}

const LinkedEntities: React.FC<Props> = ({ ownerType, ownerId, onOpen, readOnly }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<LinkedEntity[]>([]);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ type: 'task' | 'article'; id: string; title: string }[]>([]);

  const targetType = ownerType === 'task' ? 'article' : 'task';

  const refresh = () => listLinks(ownerType, ownerId).then(setItems).catch(() => {});
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  useEffect(() => {
    if (!adding || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/api/search', { params: { q: q.trim() } });
        const tasks = (r.data.results?.tasks || []).map((x: any) => ({ type: 'task' as const, id: x._id, title: x.title }));
        const articles = (r.data.results?.articles || []).map((x: any) => ({ type: 'article' as const, id: x._id, title: x.title }));
        const all = targetType === 'task' ? tasks : articles;
        setResults(all.filter((x: any) => x.id !== ownerId).slice(0, 10));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, adding, targetType, ownerId]);

  const add = async (id: string, type: 'task' | 'article') => {
    try {
      await createLink(ownerType, ownerId, type, id);
      setAdding(false); setQ(''); setResults([]);
      refresh();
    } catch (e: any) {
      const s = e?.response?.status;
      toast(s === 409 ? 'Связь уже есть' : (e?.response?.data?.message || 'Не удалось связать'), 'error');
    }
  };

  const remove = async (linkId: string) => {
    try { await deleteLink(linkId); setItems((p) => p.filter((x) => x.linkId !== linkId)); }
    catch { toast('Не удалось удалить связь', 'error'); }
  };

  return (
    <div className="linked-block">
      <div className="linked-head">
        <span className="linked-title"><Link2 size={16} /> Связи</span>
        {!readOnly && (
          <button type="button" className="att-add-btn" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Отмена' : 'Связать'}
          </button>
        )}
      </div>

      {adding && (
        <div className="linked-add">
          <div className="linked-search">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={targetType === 'task' ? 'Найти задачу…' : 'Найти статью…'} autoFocus />
          </div>
          {results.map((r) => (
            <button key={r.id} type="button" className="linked-result" onClick={() => add(r.id, r.type)}>
              <Plus size={13} /> {r.title}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="att-empty">Нет связей</p>
      ) : (
        <ul className="linked-list">
          {items.map((l) => (
            <li key={l.linkId} className="linked-item">
              <button type="button" className="linked-open" onClick={() => onOpen?.(l.type, l.id)}>
                <span className={'linked-badge linked-badge--' + l.type}>{l.type === 'task' ? 'Задача' : 'Статья'}</span>
                <span className="linked-name">{l.title}</span>
              </button>
              {!readOnly && (
                <button type="button" className="att-del" onClick={() => remove(l.linkId)} title="Удалить связь"><X size={14} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LinkedEntities;
