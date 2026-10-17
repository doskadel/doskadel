import React, { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import { LinkedEntity, listLinks, createLink, deleteLink } from '../../utils/links';
import { useToast } from '../Toast';
import LinkSearchModal from './LinkSearchModal';

interface Props {
  ownerType: 'task' | 'article';
  ownerId: string;
  onOpen?: (type: 'task' | 'article', id: string) => void;
  readOnly?: boolean;
}

const LinkedEntities: React.FC<Props> = ({ ownerType, ownerId, onOpen, readOnly }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<LinkedEntity[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const refresh = () => listLinks(ownerType, ownerId).then(setItems).catch(() => {});
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  const add = async (type: 'task' | 'article', id: string) => {
    try {
      await createLink(ownerType, ownerId, type, id);
      setSearchOpen(false);
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
          <button type="button" className="att-add-btn" onClick={() => setSearchOpen(true)}>Связать</button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="att-empty">Нет связей</p>
      ) : (
        <ul className="linked-list">
          {items.map((l) => (
            <li key={l.linkId} className="linked-item">
              <button type="button" className="linked-open" onClick={() => onOpen?.(l.type, l.id)}>
                <span className={'linked-badge linked-badge--' + l.type}>{l.type === 'task' ? 'Задача' : 'Статья'}</span>
                <span className={'linked-name' + (l.isFinal ? ' linked-name--done' : '')}>{l.title}</span>
                {l.statusName && <span className="linked-status">{l.statusName}</span>}
              </button>
              {!readOnly && (
                <button type="button" className="att-del" onClick={() => remove(l.linkId)} title="Удалить связь"><X size={14} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      <LinkSearchModal
        open={searchOpen}
        excludeType={ownerType}
        excludeId={ownerId}
        onClose={() => setSearchOpen(false)}
        onPick={add}
      />
    </div>
  );
};

export default LinkedEntities;
