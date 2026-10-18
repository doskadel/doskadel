import React, { useEffect, useState } from 'react';
import { Tag as TagIcon, X } from 'lucide-react';
import { Tag, listTags, onTagsChanged } from '../../utils/tags';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Мультивыбор тегов для фильтра списка (задачи/статьи). */
const TagFilter: React.FC<Props> = ({ value, onChange }) => {
  const [all, setAll] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = () => listTags().then(setAll).catch(() => {});
  useEffect(() => { refresh(); const unsub = onTagsChanged(() => refresh()); return () => { unsub(); }; }, []);

  if (all.length === 0) return null;

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const selected = all.filter((t) => value.includes(t._id));

  return (
    <div className="tag-filter">
      <button type="button" className="tag-filter-btn" onClick={() => setOpen((v) => !v)}>
        <TagIcon size={14} /> Теги{selected.length ? ` (${selected.length})` : ''}
      </button>
      {selected.map((t) => (
        <span key={t._id} className="tag-chip">
          {t.name}
          <button type="button" className="tag-chip-x" onClick={() => toggle(t._id)} aria-label={`Убрать ${t.name}`}><X size={11} /></button>
        </span>
      ))}
      {open && (
        <div className="tag-pop" style={{ position: 'absolute', zIndex: 40 }}>
          <div className="tag-pop-list">
            {all.map((t) => (
              <button key={t._id} type="button" className={'tag-pop-item' + (value.includes(t._id) ? ' tag-pop-item--on' : '')} onClick={() => toggle(t._id)}>
                <TagIcon size={13} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagFilter;
