import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import KanbanBoard, { KanbanTask } from './KanbanBoard';
import Modal from './Modal';
import TaskModal from './TaskModal';
import StatusManager from './StatusManager';
import FilterBar from './FilterBar';
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
  const q = searchParams.get('q') || '';
  const statusesParam = searchParams.get('statuses') || '';
  const priorityParam = searchParams.get('priority') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortParam = searchParams.get('sort') || '';

  const statusIds = statusesParam ? statusesParam.split(',').filter(Boolean) : [];
  const priorityFilter = priorityParam
    ? priorityParam.split(',').map((p) => parseInt(p, 10)).filter((p) => p >= 1 && p <= 3)
    : [];

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

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) {
        updateQuery({ q: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [q, statusesParam, priorityParam, dateFrom, dateTo, sortParam]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const fetchStatuses = async () => {
    try {
      const res = await api.get('/api/statuses');
      setStatuses(res.data.statuses);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusIds.length > 0) params.set('statusIds', statusIds.join(','));
      if (priorityFilter.length > 0) params.set('priority', priorityFilter.join(','));
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (sortParam) params.set('sort', sortParam);

      const url = '/api/tasks' + (params.toString() ? '?' + params.toString() : '');
      const res = await api.get(url);
      setTasks(res.data.tasks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setLoading(false);
    }
  };

  const refreshAll = () => {
    fetchStatuses();
    fetchTasks();
  };

  const getStatusName = (statusId: string): string => {
    return statuses.find((s) => s._id === statusId)?.name || 'Неизвестно';
  };

  const openTask = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('task', id);
    setSearchParams(next);
  };

  const closeTaskModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('task');
    setSearchParams(next);
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
      refreshAll();
    } catch (err) {
      console.error('Error creating task:', err);
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
      fetchTasks();
    }
  };

  const handleResetFilters = () => {
    updateQuery({ q: null, priority: null, statuses: null, dateFrom: null, dateTo: null });
    setSearchInput('');
  };

  const handleDateFromChange = (value: string) => {
    if (value && dateTo && value > dateTo) {
      // Не даём поставить "С" позже "По"
      return;
    }
    updateQuery({ dateFrom: value || null });
  };

  const handleDateToChange = (value: string) => {
    if (value && dateFrom && value < dateFrom) {
      // Не даём поставить "По" раньше "С"
      return;
    }
    updateQuery({ dateTo: value || null });
  };

  const dateError = (() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return 'Дата «По» не может быть раньше даты «С»';
    }
    return '';
  })();

  const hasActiveFilters = !!(
    q ||
    statusIds.length > 0 ||
    priorityFilter.length > 0 ||
    dateFrom ||
    dateTo
  );

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
                className={view === 'kanban' ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView('kanban')}
                title="Канбан"
              >
                ▦ Канбан
              </button>
              <button
                type="button"
                className={view === 'list' ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView('list')}
                title="Список"
              >
                ☰ Список
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

      <FilterBar
        q={searchInput}
        onQChange={setSearchInput}
        statusIds={statusIds}
        onStatusIdsChange={(ids) => updateQuery({ statuses: ids.length > 0 ? ids.join(',') : null })}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(priorities) => updateQuery({ priority: priorities.length > 0 ? priorities.join(',') : null })}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        statuses={statuses}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        dateError={dateError}
      />

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
        onChanged={refreshAll}
      />

      <TaskModal
        taskId={openedTaskId}
        statuses={statuses}
        onClose={closeTaskModal}
        onUpdate={refreshAll}
      />

      {tasks.length === 0 && hasActiveFilters && (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
          Ничего не найдено по вашим фильтрам
        </p>
      )}

      {tasks.length > 0 && view === 'kanban' && (
        <KanbanBoard
          tasks={tasks as KanbanTask[]}
          statuses={statuses}
          onReorder={handleReorder}
          onOpenTask={openTask}
        />
      )}

      {tasks.length > 0 && view === 'list' && (
        <div>
          {tasks.map((task) => (
            <div key={task._id} className="card" style={{ marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => openTask(task._id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
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
                {task.description && (
                  <p className="card-description">{task.description}</p>
                )}
                <p>Статус: {getStatusName(task.statusId)}</p>
                <p>Приоритет: {getPriorityLabel(task.priority)}</p>
                <p>Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}</p>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tasks;