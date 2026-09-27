import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';
import { PRIORITY_OPTIONS, getPriorityLabel } from '../utils/priority';
import { Status } from '../utils/status';

interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskModalProps {
  taskId: string | null;
  statuses: Status[];
  onClose: () => void;
  onUpdate: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ taskId, statuses, onClose, onUpdate }) => {
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatusId, setEditStatusId] = useState('');
  const [editPriority, setEditPriority] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setIsEditing(false);
      setLinkCopied(false);
      return;
    }
    fetchTask(taskId);
  }, [taskId]);

  const fetchTask = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/tasks/${id}`);
      const t = response.data.task;
      setTask(t);
      setEditTitle(t.title);
      setEditDescription(t.description || '');
      setEditStatusId(t.statusId);
      setEditPriority(t.priority);
    } catch (err: any) {
      console.error('Error fetching task:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить задачу');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const startEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatusId(task.statusId);
    setEditPriority(task.priority);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/tasks/${task._id}`, {
        title: editTitle,
        description: editDescription,
        statusId: editStatusId,
        priority: editPriority,
      });
      setTask(response.data.task);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const quickChangeStatus = async (newStatusId: string) => {
    if (!task) return;
    try {
      const response = await api.put(`/api/tasks/${task._id}`, { statusId: newStatusId });
      setTask(response.data.task);
      onUpdate();
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/api/tasks/${task._id}`);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleCopyLink = async () => {
    if (!task) return;
    const url = `${window.location.origin}/tasks?task=${task._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openFullPage = () => {
    if (!task) return;
    onClose();
    navigate(`/tasks/${task._id}`);
  };

  const getStatusName = (statusId: string): string => {
    return statuses.find((s) => s._id === statusId)?.name || 'Неизвестно';
  };

  const modalTitle = isEditing ? 'Редактирование задачи' : (task?.title || '');

  const rail = task && !loading && !error ? (
    <>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={handleCopyLink}
        title={linkCopied ? 'Скопировано!' : 'Копировать ссылку'}
        aria-label="Копировать ссылку"
      >
        {linkCopied ? '✓' : '🔗'}
      </button>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={startEdit}
        title="Редактировать"
        aria-label="Редактировать"
        disabled={isEditing}
      >
        ✏️
      </button>
      <button
        type="button"
        className="modal-rail-btn modal-rail-btn--danger"
        onClick={handleDelete}
        title="Удалить"
        aria-label="Удалить"
      >
        🗑️
      </button>
    </>
  ) : null;

  return (
    <Modal open={!!taskId} onClose={handleClose} title={modalTitle} wide rightRail={rail}>
      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {task && !loading && !error && (
        <>
          {isEditing ? (
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
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button"
                  onClick={cancelEdit}
                  style={{ backgroundColor: 'var(--color-text-muted)' }}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={saveEdit}
                  disabled={saving || !editTitle.trim()}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                {task.description ? (
                  <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: 'var(--color-text)', margin: 0 }}>{task.description}</p>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>Нет описания</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Статус</p>
                  <select
                    value={task.statusId}
                    onChange={(e) => quickChangeStatus(e.target.value)}
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
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Создано</p>
                  <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(task.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Обновлено</p>
                  <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{new Date(task.updatedAt).toLocaleString('ru-RU')}</p>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  💡 Скоро: связь с базой знаний
                </p>
                <button
                  type="button"
                  onClick={openFullPage}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                >
                  Открыть полностью →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default TaskModal;