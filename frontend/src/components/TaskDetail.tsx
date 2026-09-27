import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

const statusMap: Record<string, string> = {
  pending: 'В ожидании',
  in_progress: 'В работе',
  completed: 'Выполнено',
  cancelled: 'Отменено',
};

const statusOptions: Array<Task['status']> = ['pending', 'in_progress', 'completed', 'cancelled'];

const priorityLabel = (p: number): string => {
  if (p <= 1) return 'Очень низкий';
  if (p === 2) return 'Низкий';
  if (p === 3) return 'Средний';
  if (p === 4) return 'Высокий';
  return 'Критичный';
};

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<Task['status']>('pending');
  const [editPriority, setEditPriority] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const response = await api.get(`/api/tasks/${id}`);
      setTask(response.data.task);
      setEditTitle(response.data.task.title);
      setEditDescription(response.data.task.description || '');
      setEditStatus(response.data.task.status);
      setEditPriority(response.data.task.priority);
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
    setEditStatus(task.status);
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
        status: editStatus,
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
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/api/tasks/${task._id}`);
      navigate('/tasks');
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const quickChangeStatus = async (newStatus: Task['status']) => {
    if (!task) return;
    try {
      const response = await api.put(`/api/tasks/${task._id}`, { status: newStatus });
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
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as Task['status'])}
              className="input"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{statusMap[s]}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="5"
              value={editPriority}
              onChange={(e) => setEditPriority(parseInt(e.target.value) || 1)}
              className="input"
              placeholder="Приоритет (1-5)"
            />
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
                value={task.status}
                onChange={(e) => quickChangeStatus(e.target.value as Task['status'])}
                className="input"
                style={{ padding: '6px 10px', fontSize: '14px' }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{statusMap[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Приоритет</p>
              <p style={{ color: 'var(--color-text)', fontSize: '15px' }}>{task.priority} — {priorityLabel(task.priority)}</p>
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
              💡 Скоро: возможность связывать задачи с записями дневника
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;