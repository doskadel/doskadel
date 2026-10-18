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
import { removeAttachmentFromJson, toggleChecklistItem } from './editor/normalize';
import api from '../utils/api';
import AttachmentBlock from './attachments/AttachmentBlock';
import { uploadAttachment, notifyAttachmentsChanged, listAttachments, onAttachmentsChanged, AttachmentMeta } from '../utils/attachments';
import TagSelector from './tags/TagSelector';
import LinkedEntities from './links/LinkedEntities';
import CommentSection from './comments/CommentSection';
import EntityLayout from './entity/EntityLayout';

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
  onChecklistSaved?: () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="entity-aside-field">
    <span className="entity-aside-label">{label}</span>
    {children}
  </div>
);

const TaskModalContent: React.FC<TaskModalContentProps> = (props) => {
  const {
    task, loading, error, statuses, isEditing,
    editTitle, editDescription, editDescriptionJson, editTagIds, editStatusId, editPriority, editDueDate, editRecurrence, saving,
    setEditTitle, setEditDescription, setEditDescriptionJson, setEditTagIds, setEditStatusId, setEditPriority, setEditDueDate, setEditRecurrence,
    onSave, onCancel, onQuickChangeStatus, onQuickAction, pendingCount = 0, onChecklistSaved,
  } = props;

  const [attachments, setAttachments] = React.useState<AttachmentMeta[]>([]);
  React.useEffect(() => {
    if (!task) return;
    const load = () => listAttachments('task', task._id).then(setAttachments).catch(() => {});
    load();
    const unsub = onAttachmentsChanged(() => load());
    return () => { unsub(); };
  }, [task?._id]);
  const checklistBase = React.useRef<any>(null);
  React.useEffect(() => { checklistBase.current = null; }, [task?.descriptionJson]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!task) return null;

  const due = task.dueDate;
  const taskFinal = !!statuses.find((s) => s._id === task.statusId)?.isFinal;
  const isRecurring = !!task.recurrence;

  const head = isEditing ? (
    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" placeholder="Название" required />
  ) : null;

  const body = isEditing ? (
    <RichTextEditor
      value={editDescriptionJson}
      attachments={attachments}
      initialMarkdown={!editDescriptionJson && editDescription ? editDescription : undefined}
      onChange={(json, md) => { setEditDescriptionJson(json); setEditDescription(md); }}
      placeholder="Описание"
      onUploadFile={async (file) => {
        try {
          const att = await uploadAttachment(file, { ownerType: 'task', ownerId: task._id });
          notifyAttachmentsChanged();
          return { id: att._id, filename: att.filename, mime: att.mime };
        } catch { return null; }
      }}
    />
  ) : (
    (task.descriptionJson || task.description) ? (
      <RichTextRenderer
        contentJson={task.descriptionJson}
        markdown={task.description}
        className="md-content"
        onToggleCheck={(idx, checked) => {
          if (!task.descriptionJson) return;
          const base = checklistBase.current || task.descriptionJson;
          const next = toggleChecklistItem(base, idx, checked);
          checklistBase.current = next;
          api.put(`/api/tasks/${task._id}`, { descriptionJson: next, descriptionFormat: 'json' })
            .then(() => onChecklistSaved?.())
            .catch(() => {});
        }}
      />
    ) : (
      <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>Нет описания</p>
    )
  );

  const extras = (
    <>
      <AttachmentBlock
        ownerType="task"
        ownerId={task._id}
        readOnly={!isEditing}
        onDeleted={isEditing ? (att) => setEditDescriptionJson((prev: any) => removeAttachmentFromJson(prev, att._id)) : undefined}
      />
      <LinkedEntities ownerType="task" ownerId={task._id} onOpen={(t, id) => window.open(t === 'task' ? `/tasks?task=${id}` : `/knowledge?article=${id}`, '_blank')} />
      {!isEditing && <CommentSection ownerType="task" ownerId={task._id} />}
    </>
  );

  const aside = (
    <>
      {isEditing ? (
        <>
          <Field label="Статус">
            <select value={editStatusId} onChange={(e) => setEditStatusId(e.target.value)} className="input">
              {statuses.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Приоритет">
            <select value={editPriority} onChange={(e) => setEditPriority(parseInt(e.target.value))} className="input">
              {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Повторять">
            <button type="button" role="switch" aria-checked={!!editRecurrence} className={'rec-toggle' + (editRecurrence ? ' rec-toggle--on' : '')} onClick={() => setEditRecurrence(editRecurrence ? null : getDefaultRecurrence('daily'))}>
              <span className="rec-toggle-knob" /><span className="rec-toggle-text">Повторять</span>
            </button>
          </Field>
          {editRecurrence ? (
            <RecurrencePicker value={editRecurrence} onChange={setEditRecurrence} />
          ) : (
            <Field label="Срок">
              <ClearableField onClear={() => setEditDueDate('')} showClear={!!editDueDate}>
                <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="input" />
              </ClearableField>
            </Field>
          )}
          <Field label="Теги"><TagSelector value={editTagIds} onChange={setEditTagIds} /></Field>
        </>
      ) : (
        <>
          <Field label="Статус">
            {task.recurrence ? (
              <span style={{ color: task.occurrenceStatus === 'overdue' ? 'var(--color-danger)' : 'var(--color-text)' }}>{task.occurrenceStatus === 'overdue' ? 'Просрочено' : 'Ожидает'}</span>
            ) : (
              <select value={task.statusId} onChange={(e) => onQuickChangeStatus(e.target.value)} className="input">{statuses.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
            )}
          </Field>
          <Field label="Приоритет"><span className="entity-aside-value">{getPriorityLabel(task.priority)}</span></Field>
          {isRecurring && (
            <Field label="Повторение">
              <span className="entity-aside-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Repeat size={15} /> {formatRecurrence(task.recurrence)}</span>
              {task.nextOccurrenceDueAt && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Ближайшее: {formatDueDate(task.nextOccurrenceDueAt)}</span>}
              {pendingCount > 0 && <span className={'task-pending-badge' + (taskFinal ? ' task-pending-badge--final' : '')}>{pendingCount} не подтверждено</span>}
            </Field>
          )}
          {!isRecurring && due && <Field label="Срок"><span className="entity-aside-value" style={{ color: isOverdue(due) && !taskFinal ? 'var(--color-danger)' : undefined }}>{formatDueDate(due)}</span></Field>}
          <Field label="Теги"><TagSelector value={Array.isArray(task.tagIds) ? task.tagIds : []} onChange={() => {}} readOnly /></Field>
          <Field label="Создано"><span className="entity-aside-value">{new Date(task.createdAt).toLocaleString('ru-RU')}</span></Field>
          <Field label="Обновлено"><span className="entity-aside-value">{new Date(task.updatedAt).toLocaleString('ru-RU')}</span></Field>
        </>
      )}
    </>
  );

  const footer = isEditing ? (
    <>
      <button type="button" className="button" onClick={onCancel} disabled={saving} style={{ backgroundColor: 'var(--color-text-muted)' }}>Отмена</button>
      <button type="button" className="button" onClick={onSave} disabled={saving || !editTitle.trim()}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
    </>
  ) : null;

  return <EntityLayout head={head} body={body} extras={extras} aside={aside} asideTitle="Информация о задаче" footer={footer} />;
};

export default TaskModalContent;
