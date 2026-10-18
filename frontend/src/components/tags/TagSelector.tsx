import React, { useEffect, useRef, useState } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { Tag, listTags, createTag, onTagsChanged } from '../../utils/tags';
import { useToast } from '../Toast';

interface Props {
  value: string[]; // tagIds
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
  max?: number;
}

const MAX_TAGS = 10;

const TagSelector: React.FC<Props> = ({ value, onChange, readOnly, max = MAX_TAGS }) => {
  const { toast } = useToast();
  const [all, setAll] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = () => listTags().then(setAll).catch(() => {});
  useEffect(() => { refresh(); const unsub = onTagsChanged(() => refresh()); return () => { unsub(); }; }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = all.filter((t) => value.includes(t._id));
  const byId = (id: string) => all.find((t) => t._id === id);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < max) onChange([...value, id]);
    else toast(`Не больше ${max} тегов`, 'error');
  };

  const addNew = async () => {
    const name = query.trim();
    if (!name) return;
    try {
      const tag = await createTag(name);
      setAll((prev) => [...prev, tag]);
      if (value.length < max) onChange([...value, tag._id]);
      setQuery('');
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response?.data?.tag) {
        const tag = err.response.data.tag as Tag;
        setAll((prev) => (prev.find((t) => t._id === tag._id) ? prev : [...prev, tag]));
        if (!value.includes(tag._id) && value.length < max) onChange([...value, tag._id]);
        setQuery('');
      } else {
        toast('Не удалось создать тег', 'error');
      }
    }
  };

  const filtered = all.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));
  const canCreate = query.trim() && !all.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="tag-selector" ref={wrapRef}>
      <div className="tag-chips">
        {selected.map((t) => (
          <span key={t._id} className="tag-chip" style={t.color ? { backgroundColor: t.color + '22', borderColor: t.color } : undefined}>
            {t.name}
            {!readOnly && (
              <button type="button" className="tag-chip-x" onClick={() => toggle(t._id)} aria-label={`Убрать ${t.name}`}><X size={11} /></button>
            )}
          </span>
        ))}
        {selected.length === 0 && readOnly && <span className="tag-empty">Нет тегов</span>}
        {!readOnly && (
          <button type="button" className="tag-add" onClick={() => setOpen((v) => !v)} title="Добавить тег">
            <Plus size={13} /> Теги
          </button>
        )}
      </div>
      {open && !readOnly && (
        <div className="tag-pop">
          <input
            className="tag-search"
            placeholder="Поиск или новый тег…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canCreate) addNew(); } }}
            autoFocus
          />
          <div className="tag-pop-list">
            {filtered.map((t) => (
              <button key={t._id} type="button" className={'tag-pop-item' + (value.includes(t._id) ? ' tag-pop-item--on' : '')} onClick={() => toggle(t._id)}>
                <TagIcon size={13} /> {t.name}
              </button>
            ))}
            {canCreate && (
              <button type="button" className="tag-pop-item tag-pop-create" onClick={addNew}><Plus size={13} /> Создать «{query.trim()}»</button>
            )}
            {filtered.length === 0 && !canCreate && <span className="tag-pop-empty">Нет тегов</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;
