import React from 'react';
import { Task } from '../hooks/useTaskDetail';
import { PRIORITY_OPTIONS, getPriorityLabel } from '../utils/priority';
import { Status } from '../utils/status';
import { formatDueDate, isOverdue } from '../utils/date';
import { formatRecurrence, getDefaultRecurrence, Recurrence } from '../utils/recurrence';
import RecurrencePicker from './RecurrencePicker';
import ClearableField from './ClearableField';

interface TaskModalContentProps {
  task: Task | null;
  loading: boolean;
  error: string;
  statuses: Status[];

  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  editStatusId: string;
  editPriority: number;
  editDueDate: string;
  editRecurrence: Recurrence | null;
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditDescription: (v: string) => void;
  setEditStatusId: (v: string) => void;
  setEditPriority: (v: number) => void;
  setEditDueDate: (v: string) => void;
  setEditRecurrence: (v: Recurrence | null) => void;

  onSave: () => void;
  onCancel: () => void;
  onQuickChangeStatus: (statusId: string) => void;
  pendingCount?: number;
}

const TaskModalContent: React.FC<TaskModalContentProps> = ({
  task,
  loading,
  error,
  statuses,
  isEditing,
  editTitle,
  editDescription,
  editStatusId,
  editPriority,
  editDueDate,
  editRecurrence,
  saving,
  setEditTitle,
  setEditDescription,
  setEditStatusId,
  setEditPriority,
  setEditDueDate,
  setEditRecurrence,
  onSave,
  onCancel,
  onQuickChangeStatus,
  pendingCount = 0,
}) => {
  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!task) return null;

  if (isEditing) {
    return (
      <div className="form" style={{ maxWidth: '100%', margin: 0 }}>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="input"
          placeholder="Название"
          required
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          className="input"
          rows={6}
          placeholder="Описание"
        />
        <select
          value={editStatusId}
          onChange={(e) => setEditStatusId(e.target.value)}
          className="input"
        >
          {statuses.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
        <select
          value={editPriority}
          onChange={(e) => setEditPriority(parseInt(e.target.value))}
          className="input"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <div>
          <label className="input-label">Тип задачи</label>
          <select
            className="input"
            value={editRecurrence ? 'recurring' : 'single'}
            onChange={(e) => {
              if (e.target.value === 'single') {
                setEditRecurrence(null);
              } else {
                setEditRecurrence(getDefaultRecurrence('daily'));
              }
            }}
          >
            <option value="single">Разовое</option>
            <option value="recurring">Повторяющееся</option>
          </select>
        </div>

        {editRecurrence ? (
          <RecurrencePicker value={editRecurrence} onChange={setEditRecurrence} />
        ) : (
          <div>
            <label className="input-label">Срок</label>
            <ClearableField onClear={() => setEditDueDate('')} showClear={!!editDueDate}>
              <input
                type="datetime-local"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="input"
              />
            </ClearableField>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="button"
            onClick={onCancel}
            style={{ backgroundColor: 'var(--color-text-muted)' }}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="button"
            onClick={onSave}
            disabled={saving || !editTitle.trim()}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  const due = task.dueDate;
  const overdue = isOverdue(due);
  const isRecurring = !!task.recurrence;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        {task.description ? (
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: 'var(--color-text)', margin: 0 }}>
            {task.description}
          </p>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
            Нет описания
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Статус</p>
          <select
            value={task.statusId}
            onChange={(e) => onQuickChangeStatus(e.target.value)}
            className="input"
            style={{ padding: '6px 10px', fontSize: '14px' }}
          >
            {statuses.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Приоритет</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{getPriorityLabel(task.priority)}</p>
        </div>

        {isRecurring ? (
          <div>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Повторение</p>
            <p style={{ color: 'var(--color-text)', fontSize: '15px', margin: 0 }}>
              🔄 {formatRecurrence(task.recurrence)}
            </p>
            {pendingCount > 0 && (
              <p className="task-pending-badge">
                ⚠️ {pendingCount} не подтверждено
              </p>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Срок</p>
            {due ? (
              <p style={{
                color: overdue ? 'var(--color-danger)' : 'var(--color-text)',
                fontSize: '15px',
                fontWeight: overdue ? 500 : 400,
                margin: 0,
              }}>
                📅 {formatDueDate(due)}
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', fontStyle: 'italic', margin: 0 }}>Не указан</p>
            )}
          </div>
        )}

        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Создано</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px', margin: 0 }}>{new Date(task.createdAt).toLocaleString('ru-RU')}</p>
        </div>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Обновлено</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px', margin: 0 }}>{new Date(task.updatedAt).toLocaleString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskModalContent;