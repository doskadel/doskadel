import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PRIORITY_OPTIONS, getPriorityLabel } from '../utils/priority';
import { Status } from '../utils/status';
import { useConfirm } from './ConfirmProvider';

interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [task, setTask] = useState<Task | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatusId, setEditStatusId] = useState('');
  const [editPriority, setEditPriority] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [taskRes, statusesRes] = await Promise.all([
        api.get(`/api/tasks/${id}`),
        api.get('/api/statuses'),
      ]);
      const t = taskRes.data.task;
      setTask(t);
      setStatuses(statusesRes.data.statuses);
      setEditTitle(t.title);
      setEditDescription(t.description || '');
      setEditStatusId(t.statusId);
      setEditPriority(t.priority);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching task:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить задачу');
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    const ok = await confirm({
      title: 'Удалить задачу?',
      message: 'Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/tasks/${task._id}`);
      navigate('/tasks');
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const quickChangeStatus = async (newStatusId: string) => {
    if (!task) return;
    try {
      const response = await api.put(`/api/tasks/${task._id}`, { statusId: newStatusId });
      setTask(response.data.task);
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!task) return <p>Задача не найдена</p>;

  return (
    <div>
      {isEditing ? (
        <div className="card" style={{ border: '1px solid var(--color-primary)' }}>
          <h2 className="page-title" style={{ marginBottom: 'var(--space-md)' }}>Редактирование задачи</h2>
          <div className="form" style={{ maxWidth: 'none' }}>
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
              rows={5}
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
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <h2 className="page-title" style={{ margin: 0 }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                className="button"
                onClick={startEdit}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="button"
                onClick={handleDelete}
                style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-danger)' }}
              >
                Удалить
              </button>
            </div>
          </div>

          {task.description && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{task.description}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
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

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              💡 Скоро: возможность связывать задачи со статьями
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;