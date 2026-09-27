import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import KanbanBoard, { KanbanTask } from './KanbanBoard';
import Modal from './Modal';
import TaskModal from './TaskModal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PRIORITY_OPTIONS, getPriorityLabel, getPriorityColor } from '../utils/priority';

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

const VIEW_KEY = 'worklist_tasks_view';

const Tasks: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [searchParams, setSearchParams] = useSearchParams();

  const openedTaskId = searchParams.get('task');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'kanban'>(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'kanban' || saved === 'list') return saved;
    return window.matchMedia('(max-width: 640px)').matches ? 'list' : 'kanban';
  });

  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<Task['status']>('pending');
  const [editPriority, setEditPriority] = useState<number>(2);
  const [savingEdit, setSavingEdit] = useState(false);
  const [originalTask, setOriginalTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

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

  const openTask = (id: string) => {
    setSearchParams({ task: id });
  };

  const closeTaskModal = () => {
    setSearchParams({});
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPriority('');
  };

  const isCreateFormDirty = (): boolean => {
    return title.trim() !== '' || description.trim() !== '' || priority !== '';
  };

  const handleCloseCreate = () => {
    if (isCreateFormDirty()) {
      if (!window.confirm('Есть несохранённые данные. Закрыть?')) return;
    }
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priority === '') return;
    try {
      await api.post('/api/tasks', {
        title,
        description,
        priority,
        status: 'pending',
      });
      resetCreateForm();
      setCreateOpen(false);
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
    setOriginalTask(task);
  };

  const isEditFormDirty = (): boolean => {
    if (!originalTask) return false;
    return (
      editTitle !== originalTask.title ||
      editDescription !== (originalTask.description || '') ||
      editStatus !== originalTask.status ||
      editPriority !== originalTask.priority
    );
  };

  const cancelEdit = () => {
    if (isEditFormDirty()) {
      if (!window.confirm('Есть несохранённые изменения. Отменить?')) return;
    }
    setEditingId(null);
    setOriginalTask(null);
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
      setOriginalTask(null);
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

  const handleChangeStatus = async (taskId: string, newStatus: Task['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      console.error('Error changing status:', err);
      fetchTasks();
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Мои задачи</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          {!isMobile && (
            <div className="view-toggle">
              <button
                type="button"
                className={view === 'list' ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView('list')}
                title="Список"
              >
                ☰ Список
              </button>
              <button
                type="button"
                className={view === 'kanban' ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView('kanban')}
                title="Канбан"
              >
                ▦ Канбан
              </button>
            </div>
          )}
          <button
            type="button"
            className="button"
            onClick={() => setCreateOpen(true)}
          >
            + Добавить задачу
          </button>
        </div>
      </div>

      <Modal open={createOpen} onClose={handleCloseCreate} title="Новая задача">
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
            autoFocus
          />
          <textarea
            placeholder="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            rows={4}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="input"
            required
          >
            <option value="" disabled hidden>Выберите приоритет</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              className="button"
              onClick={handleCloseCreate}
              style={{ backgroundColor: 'var(--color-text-muted)' }}
            >
              Отмена
            </button>
            <button type="submit" className="button" disabled={priority === ''}>
              Создать
            </button>
          </div>
        </form>
      </Modal>

      <TaskModal
        taskId={openedTaskId}
        onClose={closeTaskModal}
        onUpdate={fetchTasks}
      />

      {view === 'kanban' ? (
        <KanbanBoard
          tasks={tasks as KanbanTask[]}
          onChangeStatus={handleChangeStatus}
          onOpenTask={openTask}
        />
      ) : (
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
                        <option key={s} value={s}>{statusMap[s]}</option>
                      ))}
                    </select>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(parseInt(e.target.value))}
                      className="input"
                      style={{ flex: 1 }}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => openTask(task._id)}
                      style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', width: '100%' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-sm)' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: getPriorityColor(task.priority),
                            flexShrink: 0,
                          }}
                        />
                        <h3 style={{ margin: 0 }}>{task.title}</h3>
                      </div>
                      <p>{task.description}</p>
                      <p>Статус: {statusMap[task.status] || task.status}</p>
                      <p>Приоритет: {getPriorityLabel(task.priority)}</p>
                      <p>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</p>
                    </button>
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
      )}
    </div>
  );
};

export default Tasks;