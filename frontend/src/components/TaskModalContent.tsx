import React from 'react';
import { Calendar, Repeat, Check, SkipForward } from 'lucide-react';
import { Task } from '../hooks/useTaskDetail';
import { PRIORITY_OPTIONS, getPriorityLabel } from '../utils/priority';
import { Status } from '../utils/status';
import { formatDueDate, isOverdue } from '../utils/date';
import { formatRecurrence, getDefaultRecurrence, Recurrence } from '../utils/recurrence';
import RecurrencePicker from './RecurrencePicker';
import ClearableField from './ClearableField';
import RichTextEditor from './editor/RichTextEditor';
import RichTextRenderer from './editor/RichTextRenderer';
import { removeAttachmentFromJson } from './editor/normalize';
import AttachmentBlock from './attachments/AttachmentBlock';
import { uploadAttachment, notifyAttachmentsChanged } from '../utils/attachments';
import TagSelector from './tags/TagSelector';
import LinkedEntities from './links/LinkedEntities';
import CommentSection from './comments/CommentSection';

interface TaskModalContentProps {
  task: Task | null;
  loading: boolean;
  error: string;
  statuses: Status[];

  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  editDescriptionJson: any;
  editTagIds: string[];
  editStatusId: string;
  editPriority: number;
  editDueDate: string;
  editRecurrence: Recurrence | null;
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditDescription: (v: string) => void;
  setEditDescriptionJson: (v: any) => void;
  setEditTagIds: (v: string[]) => void;
  setEditStatusId: (v: string) => void;
  setEditPriority: (v: number) => void;
  setEditDueDate: (v: string) => void;
  setEditRecurrence: (v: Recurrence | null) => void;

  onSave: () => void;
  onCancel: () => void;
  onQuickChangeStatus: (statusId: string) => void;
  onQuickAction?: (action: 'done' | 'skip', originalDate: string) => void;
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
  editDescriptionJson,
  editTagIds,
  editStatusId,
  editPriority,
  editDueDate,
  editRecurrence,
  saving,
  setEditTitle,
  setEditDescription,
  setEditDescriptionJson,
  setEditTagIds,
  setEditStatusId,
  setEditPriority,
  setEditDueDate,
  setEditRecurrence,
  onSave,
  onCancel,
  onQuickChangeStatus,
  onQuickAction,
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
        <RichTextEditor
          value={editDescriptionJson}
          initialMarkdown={!editDescriptionJson && editDescription ? editDescription : undefined}
          onChange={(json, md) => { setEditDescriptionJson(json); setEditDescription(md); }}
          placeholder="Описание"
          onUploadFile={async (file) => {
            try {
              const att = await uploadAttachment(file, { ownerType: 'task', ownerId: task!._id });
              notifyAttachmentsChanged();
              return { id: att._id, filename: att.filename, mime: att.mime };
            } catch { return null; }
          }}
        />
        <AttachmentBlock
          ownerType="task"
          ownerId={task!._id}
          onDeleted={(att) => setEditDescriptionJson((prev: any) => removeAttachmentFromJson(prev, att._id))}
        />
        <div>
          <label className="input-label">Теги</label>
          <TagSelector value={editTagIds} onChange={setEditTagIds} />
        </div>
        <LinkedEntities ownerType="task" ownerId={task!._id} onOpen={(t, id) => window.open(t === 'task' ? `/tasks?task=${id}` : `/knowledge?article=${id}`, '_blank')} />
        <div className="task-fields-grid">
          <div className="task-col">
            <div className="task-field" style={{ maxWidth: 'none' }}>
              <label className="input-label">Статус</label>
              <select
                value={editStatusId}
                onChange={(e) => setEditStatusId(e.target.value)}
                className="input"
              >
                {statuses.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="task-field" style={{ maxWidth: 'none' }}>
              <label className="input-label">Приоритет</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(parseInt(e.target.value))}
                className="input"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Повторять</label>
              <button
                type="button"
                role="switch"
                aria-checked={!!editRecurrence}
                className={'rec-toggle' + (editRecurrence ? ' rec-toggle--on' : '')}
                onClick={() => setEditRecurrence(editRecurrence ? null : getDefaultRecurrence('daily'))}
              >
                <span className="rec-toggle-knob" />
                <span className="rec-toggle-text">Повторять</span>
                {editRecurrence && <span className="rec-toggle-summary">· {formatRecurrence(editRecurrence)}</span>}
              </button>
            </div>
          </div>
          <div className="task-col task-col-right">
            {editRecurrence ? (
              <RecurrencePicker value={editRecurrence} onChange={setEditRecurrence} />
            ) : (
              <div className="task-date">
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
          </div>
        </div>

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
  const taskFinal = !!statuses.find((s) => s._id === task.statusId)?.isFinal;
  const overdue = !taskFinal && isOverdue(due);
  const isRecurring = !!task.recurrence;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        {(task.descriptionJson || task.description) ? (
          <RichTextRenderer contentJson={task.descriptionJson} markdown={task.description} className="md-content" />
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
            Нет описания
          </p>
        )}
      </div>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <TagSelector value={Array.isArray(task.tagIds) ? task.tagIds : []} onChange={() => {}} readOnly />
      </div>

      <AttachmentBlock ownerType="task" ownerId={task._id} readOnly />
      <LinkedEntities ownerType="task" ownerId={task._id} onOpen={(t, id) => window.open(t === 'task' ? `/tasks?task=${id}` : `/knowledge?article=${id}`, '_blank')} readOnly />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Статус</p>
          {task.recurrence ? (
            <p style={{ fontSize: '15px', color: task.occurrenceStatus === 'overdue' ? 'var(--color-danger)' : 'var(--color-text)', fontWeight: task.occurrenceStatus === 'overdue' ? 500 : 400 }}>
              {task.occurrenceStatus === 'overdue' ? 'Просрочено' : 'Ожидает'}
            </p>
          ) : (
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
          )}
        </div>
        <div>
          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Приоритет</p>
          <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{getPriorityLabel(task.priority)}</p>
        </div>

        {isRecurring ? (
          <div>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Повторение</p>
            <p style={{ color: 'var(--color-text)', fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Repeat size={15} className="recur-icon" /> {formatRecurrence(task.recurrence)}
            </p>
            {task.recurrence?.tz && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{task.recurrence.tz}</p>
            )}
            {task.nextOccurrenceDueAt && (
              <p style={{ color: 'var(--color-text)', fontSize: '15px', margin: '8px 0 0' }}>
                Ближайшее: {formatDueDate(task.nextOccurrenceDueAt)}
              </p>
            )}
            {pendingCount > 0 && (
              <p className={'task-pending-badge' + (taskFinal ? ' task-pending-badge--final' : '')}>
                {pendingCount} не подтверждено
              </p>
            )}
            {!isEditing && task.nextOccurrenceDueAt && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="occ-icon-btn"
                  title="Выполнено"
                  aria-label="Выполнено"
                  onClick={() => onQuickAction?.('done', task.nextOccurrenceDueAt!)}
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  className="occ-icon-btn"
                  title="Пропустить"
                  aria-label="Пропустить"
                  onClick={() => onQuickAction?.('skip', task.nextOccurrenceDueAt!)}
                >
                  <SkipForward size={16} />
                </button>
              </div>
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
                <Calendar size={14} /> {formatDueDate(due)}
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

      <CommentSection ownerType="task" ownerId={task._id} />
    </div>
  );
};

export default TaskModalContent;