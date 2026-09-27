import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  createdAt: string;
}

const statusMap: Record<string, string> = {
  pending: 'В ожидании',
  in_progress: 'В работе',
  completed: 'Выполнено',
  cancelled: 'Отменено',
};

const statusOptions: Array<Task['status']> = ['pending', 'in_progress', 'completed', 'cancelled'];

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма создания
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [priority, setPriority] = useState(1);

  // Инлайн-редактирование
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<Task['status']>('pending');
  const [editPriority, setEditPriority] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/api/tasks');
      setTasks(response.data.tasks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/tasks', { title, description, status, priority });
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority(1);
      fetchTasks();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.status);
    setEditPriority(task.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await api.put(`/api/tasks/${id}`, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        priority: editPriority,
      });
      setEditingId(null);
      fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <h2 className="page-title">Мои задачи</h2>

      <div className="form-wrapper">
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
          />
          <textarea
            placeholder="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            rows={3}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Task['status'])}
            className="input"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusMap[s]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="5"
            placeholder="Приоритет (1-5)"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
            className="input"
            required
          />
          <button type="submit" className="button">Добавить задачу</button>
        </form>
      </div>

      <h3 className="list-title">Список задач</h3>
      <div>
        {tasks.map((task) => {
          const isEditing = editingId === task._id;

          if (isEditing) {
            return (
              <div
                key={task._id}
                className="card"
                style={{ marginBottom: '10px', border: '1px solid var(--color-primary)' }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  style={{ marginBottom: '8px', fontWeight: 600 }}
                  required
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input"
                  rows={3}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Task['status'])}
                    className="input"
                    style={{ flex: 1 }}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusMap[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editPriority}
                    onChange={(e) => setEditPriority(parseInt(e.target.value) || 1)}
                    className="input"
                    style={{ width: '90px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button"
                    onClick={cancelEdit}
                    style={{ backgroundColor: 'var(--color-text-muted)' }}
                    disabled={savingEdit}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => saveEdit(task._id)}
                    disabled={savingEdit || !editTitle.trim()}
                  >
                    {savingEdit ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={task._id} className="card" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <p>Статус: {statusMap[task.status] || task.status}</p>
                  <p>Приоритет: {task.priority}</p>
                  <p>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="button"
                    onClick={() => startEdit(task)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => handleDelete(task._id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-danger)',
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tasks;
