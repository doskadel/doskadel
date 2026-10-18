import React, { useEffect, useState } from 'react';
import { Tag as TagIcon, Trash2, Plus, Search } from 'lucide-react';
import Modal from '../Modal';
import { Tag, listTags, createTag, deleteTag, onTagsChanged } from '../../utils/tags';
import { useToast } from '../Toast';
import { useConfirm } from '../ConfirmProvider';

interface Props { open: boolean; onClose: () => void; }

/** Модалка управления тегами: поиск, добавление, удаление. */
const TagManager: React.FC<Props> = ({ open, onClose }) => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [all, setAll] = useState<Tag[]>([]);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');

  const refresh = () => listTags().then(setAll).catch(() => {});
  useEffect(() => {
    if (!open) return;
    refresh();
    const unsub = onTagsChanged(() => refresh());
    return () => { unsub(); };
  }, [open]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try { await createTag(n); setName(''); refresh(); }
    catch (e: any) { toast(e?.response?.status === 409 ? 'Такой тег уже есть' : 'Не удалось создать', 'error'); }
  };

  const remove = async (t: Tag) => {
    const ok = await confirm({ title: `Удалить тег «${t.name}»?`, message: 'Тег снимется со всех задач и статей.', confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try { await deleteTag(t._id); refresh(); toast('Тег удалён', 'success'); }
    catch { toast('Не удалось удалить', 'error'); }
  };

  const filtered = all.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title="Управление тегами">
      <div className="tag-manager">
        <div className="tag-manager-add">
          <input className="input" placeholder="Новый тег" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="button" onClick={add} disabled={!name.trim()}><Plus size={16} /> Добавить</button>
        </div>
        <div className="tag-manager-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск тегов…" />
        </div>
        {filtered.length === 0 ? (
          <p className="att-empty">{all.length === 0 ? 'Тегов пока нет' : 'Ничего не найдено'}</p>
        ) : (
          <div className="tag-manager-list">
            {filtered.map((t) => (
              <span key={t._id} className="tag-chip tag-chip--manage">
                <TagIcon size={12} /> {t.name}
                <button type="button" className="tag-chip-x" onClick={() => remove(t)} title="Удалить"><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TagManager;
