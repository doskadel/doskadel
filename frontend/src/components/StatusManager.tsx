import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from './Modal';
import { Status, STATUS_COLOR_PALETTE } from '../utils/status';
import { useConfirm } from './ConfirmProvider';
import { useToast } from './Toast';

interface StatusManagerProps {
  open: boolean;
  statuses: Status[];
  onClose: () => void;
  onChanged: () => void;
  onBack?: () => void;
}

type ViewMode = 'list' | 'edit' | 'create';

// Строка статуса с drag-ручкой (перетаскивание меняет порядок на доске)
const SortableStatusRow: React.FC<{
  status: Status;
  deletingId: string | null;
  onEdit: (s: Status) => void;
  onDelete: (s: Status) => void;
}> = ({ status, deletingId, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status._id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="status-row">
      <button
        type="button"
        className="status-row-grip"
        aria-label="Переместить статус"
        title="Перетащите, чтобы изменить порядок"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <span className="status-row-color" style={{ backgroundColor: status.color }} />
      <span className="status-row-name">
        {status.name}
        {status.isFinal && (
          <span className="status-row-final-badge" title="Финальный статус"> · финальный</span>
        )}
      </span>
      <div className="status-row-actions">
        <button
          type="button"
          className="icon-button icon-button--sm"
          onClick={() => onEdit(status)}
          title="Редактировать"
          aria-label="Редактировать"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--sm icon-button--danger"
          onClick={() => onDelete(status)}
          title="Удалить"
          aria-label="Удалить"
          disabled={deletingId === status._id}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const StatusManager: React.FC<StatusManagerProps> = ({ open, statuses, onClose, onChanged, onBack }) => {
  const confirm = useConfirm();
  const { toast } = useToast();

  const [mode, setMode] = useState<ViewMode>('list');
  const [localStatuses, setLocalStatuses] = useState<Status[]>(statuses);
  useEffect(() => { setLocalStatuses(statuses); }, [statuses]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = localStatuses.findIndex((s) => s._id === active.id);
    const newIndex = localStatuses.findIndex((s) => s._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(localStatuses, oldIndex, newIndex);
    setLocalStatuses(next);
    try {
      await api.put('/api/statuses/reorder', { order: next.map((s, i) => ({ id: s._id, order: i })) });
      onChanged();
      toast('Порядок статусов обновлён', 'success');
    } catch (err: any) {
      setLocalStatuses(statuses); // откат
      toast(err?.response?.data?.message || 'Не удалось изменить порядок', 'error');
    }
  };
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(STATUS_COLOR_PALETTE[0]);
  const [isFinal, setIsFinal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open) {
      setMode('list');
      setEditingStatus(null);
      setError('');
      setTipOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!tipOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tipOpen]);

  const formSig = JSON.stringify([name, color, isFinal]);
  const [formSnap, setFormSnap] = useState('');
  const goToList = async () => {
    const dirty = formSnap !== '' && formSig !== formSnap;
    if (dirty) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения не будут сохранены. Выйти без сохранения?',
        confirmLabel: 'Выйти без сохранения',
        danger: true,
      });
      if (!ok) return;
    }
    setMode('list');
    setEditingStatus(null);
    setError('');
    setName('');
    setColor(STATUS_COLOR_PALETTE[0]);
    setIsFinal(false);
    setFormSnap('');
    setTipOpen(false);
  };

  const startEdit = (status: Status) => {
    setMode('edit');
    setEditingStatus(status);
    setName(status.name);
    setColor(status.color);
    setIsFinal(!!status.isFinal);
    setFormSnap(JSON.stringify([status.name, status.color, !!status.isFinal]));
    setError('');
    setTipOpen(false);
  };

  const startCreate = () => {
    setMode('create');
    setEditingStatus(null);
    setName('');
    setColor(STATUS_COLOR_PALETTE[0]);
    setIsFinal(false);
    setFormSnap(JSON.stringify(['', STATUS_COLOR_PALETTE[0], false]));
    setError('');
    setTipOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit' && editingStatus) {
        await api.put(`/api/statuses/${editingStatus._id}`, {
          name: name.trim(),
          color,
          isFinal,
        });
      } else {
        await api.post('/api/statuses', {
          name: name.trim(),
          color,
          isFinal,
        });
      }
      onChanged();
      toast(mode === 'edit' ? 'Статус обновлён' : 'Статус создан', 'success');
      // После сохранения — в список БЕЗ проверки dirty (formSnap ещё старый)
      setMode('list');
      setEditingStatus(null);
      setFormSnap('');
      setName('');
      setError('');
    } catch (err: any) {
      console.error('Error saving status:', err);
      toast(err?.response?.data?.message || 'Не удалось сохранить статус', 'error');
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (status: Status) => {
    const ok = await confirm({
      title: `Удалить статус «${status.name}»?`,
      message: 'Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(status._id);
    setError('');
    try {
      await api.delete(`/api/statuses/${status._id}`);
      onChanged();
      toast('Статус удалён', 'success');
    } catch (err: any) {
      console.error('Error deleting status:', err);
      toast(err?.response?.data?.message || 'Не удалось удалить статус', 'error');
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  // X и клик по фону: если форма создания/редактирования изменена — подтвердить выход.
  const handleClose = async () => {
    const dirty = formSnap !== '' && formSig !== formSnap;
    if (dirty) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения не будут сохранены. Выйти без сохранения?',
        confirmLabel: 'Выйти без сохранения',
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  };

  const modalTitle =
    mode === 'edit' ? 'Редактирование статуса' :
    mode === 'create' ? 'Новый статус' :
    'Управление статусами';

  const handleBackNav = mode === 'list' ? (onBack || handleClose) : goToList;

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} onBack={handleBackNav}>
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>{error}</p>}

      {mode === 'list' && (
        <div>
          {statuses.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 'var(--space-lg)' }}>
              У вас пока нет статусов
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localStatuses.map((s) => s._id)} strategy={verticalListSortingStrategy}>
                <div className="status-list">
                  {localStatuses.map((status) => (
                    <SortableStatusRow
                      key={status._id}
                      status={status}
                      deletingId={deletingId}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="button"
              onClick={startCreate}
              style={{ width: '100%' }}
            >
              + Добавить статус
            </button>
          </div>
        </div>
      )}

      {(mode === 'edit' || mode === 'create') && (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
            autoFocus
            maxLength={50}
          />

          <div>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
              Цвет
            </p>
            <div className="color-palette">
              {STATUS_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${c === color ? 'color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="checkbox-row-wrap">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
              />
              <span>Финальный статус</span>
            </label>

            <span className="info-icon-wrap" ref={tipRef}>
              <button
                type="button"
                className="info-icon"
                onClick={() => setTipOpen((v) => !v)}
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                aria-label="Справка"
                aria-expanded={tipOpen}
              >
                i
              </button>
              {tipOpen && (
                <div className="info-tooltip" role="tooltip">
                  Задачи в этом статусе не попадут в блоки
                  «Просрочено» и «Ближайшие сроки» на дашборде.
                </div>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              className="button"
              onClick={goToList}
              style={{ backgroundColor: 'var(--color-text-muted)' }}
              disabled={saving}
            >
              Отмена
            </button>
            <button type="submit" className="button" disabled={saving || !name.trim()}>
              {saving ? 'Сохранение...' : (mode === 'edit' ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default StatusManager;