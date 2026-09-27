import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import KanbanBoard, { KanbanTask } from './KanbanBoard';
import Modal from './Modal';
import TaskModal from './TaskModal';
import StatusManager from './StatusManager';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PRIORITY_OPTIONS, getPriorityLabel, getPriorityColor } from '../utils/priority';
import { Status } from '../utils/status';

interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  order: number;
  createdAt: string;
}

const VIEW_KEY = 'worklist_tasks_view';

const Tasks: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [searchParams, setSearchParams] = useSearchParams();

  const openedTaskId = searchParams.get('task');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'kanban'>(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'kanban' || saved === 'list') return saved;
    return window.matchMedia('(max-width: 640px)').matches ? 'list' : 'kanban';
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatusId, setEditStatusId] = useState<string>('');
  const [editPriority, setEditPriority] = useState<number>(2);
  const [savingEdit, setSavingEdit] = useState(false);
  const [originalTask, setOriginalTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const fetchData = async () => {
    try {
      const [tasksRes, statusesRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/statuses'),
      ]);
      setTasks(tasksRes.data.tasks);
      setStatuses(statusesRes.data.statuses);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  const getStatusName = (statusId: string): string => {
    return statuses.find((s) => s._id === statusId)?.name || 'Неизвестно';
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
      await api.post('/api/tasks', { title, description, priority });
      resetCreateForm();
      setCreateOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatusId(task.statusId);
    setEditPriority(task.priority);
    setOriginalTask(task);
  };

  const isEditFormDirty = (): boolean => {
    if (!originalTask) return false;
    return (
      editTitle !== originalTask.title ||
      editDescription !== (originalTask.description || '') ||
      editStatusId !== originalTask.statusId ||
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
        statusId: editStatusId,
        priority: editPriority,
      });
      setEditingId(null);
      setOriginalTask(null);
      fetchData();
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
      fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleReorder = async (updates: Array<{ id: string; statusId: string; order: number }>) => {
    setTasks((prev) => {
      const next = [...prev];
      updates.forEach((u) => {
        const idx = next.findIndex((t) => t._id === u.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], statusId: u.statusId, order: u.order };
        }
      });
      return next;
    });

    try {
      await api.put('/api/tasks/reorder', { tasks: updates });
    } catch (err) {
      console.error('Error reordering tasks:', err);
      fetchData();
    }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Мои задачи</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
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
            onClick={() => setStatusManagerOpen(true)}
            style={{ backgroundColor: 'var(--color-text-muted)' }}
            title="Управление статусами"
          >
            ⚙ Статусы
          </button>
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

      <StatusManager
        open={statusManagerOpen}
        statuses={statuses}
        onClose={() => setStatusManagerOpen(false)}
        onChanged={fetchData}
      />

      <TaskModal
        taskId={openedTaskId}
        statuses={statuses}
        onClose={closeTaskModal}
        onUpdate={fetchData}
      />

      {view === 'kanban' ? (
        <KanbanBoard
          tasks={tasks as KanbanTask[]}
          statuses={statuses}
          onReorder={handleReorder}
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
                      value={editStatusId}
                      onChange={(e) => setEditStatusId(e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    >
                      {statuses.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
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
                      <p>Статус: {getStatusName(task.statusId)}</p>
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