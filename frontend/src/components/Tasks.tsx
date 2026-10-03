import React, { useState, useEffect, useRef } from 'react';
import PullToRefresh from './PullToRefresh';
import LoadingOverlay from './LoadingOverlay';
import CalendarView from './CalendarView';
import SortableSettings from './shared/SortableSettings';
import { GripVertical, X, Plus, Settings, CalendarDays, Columns, List, Info, LayoutList } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import KanbanBoard, { KanbanTask } from './KanbanBoard';
import Modal from './Modal';
import TaskModal from './TaskModal';
import StatusManager from './StatusManager';
import FilterBar, { TaskTypeFilter } from './FilterBar';
import RecurrencePicker from './RecurrencePicker';
import ClearableField from './ClearableField';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { PRIORITY_OPTIONS, getPriorityLabel } from '../utils/priority';
import { deadlineLevel } from '../utils/date';
import { useUpcomingDays } from '../hooks/useUpcomingDays';
import { Status } from '../utils/status';
import { formatDueDate, isOverdue } from '../utils/date';
import { Recurrence, isRecurrenceValid, formatRecurrenceShort, getDefaultRecurrence } from '../utils/recurrence';
import { useConfirm } from './ConfirmProvider';

interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  order: number;
  dueDate?: string | null;
  recurrence?: Recurrence | null;
  pendingOccurrenceCount?: number;
  nextOccurrenceDueAt?: string | null;
  createdAt: string;
}

type TaskView = 'board' | 'list' | 'calendar';

const ALL_VIEWS: TaskView[] = ['calendar', 'board', 'list'];
const VIEW_LABELS: Record<TaskView, string> = { calendar: 'Календарь', board: 'Доска', list: 'Список' };
const VIEW_ICONS: Record<TaskView, React.ReactNode> = { calendar: <CalendarDays size={16} />, board: <Columns size={16} />, list: <List size={16} /> };

const VIEW_KEY = 'doskadel_tasks_view';
const VIEW_TABS_KEY = 'doskadel_tasks_view_tabs';
const DEFAULT_SORT = 'createdAt_desc';

const Tasks: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirm();

  const openedTaskId = searchParams.get('task');
  const q = searchParams.get('q') || '';
  const statusesParam = searchParams.get('statuses') || '';
  const priorityParam = searchParams.get('priority') || '';
  const taskTypeParam = searchParams.get('taskType') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortParam = searchParams.get('sort') || '';
  const newParam = searchParams.get('new');
  const overdueParam = searchParams.get('overdue') || '';
  const dueSoonParam = searchParams.get('dueSoon') || '';

  const statusIds = statusesParam ? statusesParam.split(',').filter(Boolean) : [];
  const priorityFilter = priorityParam
    ? priorityParam.split(',').map((p) => parseInt(p, 10)).filter((p) => p >= 1 && p <= 3)
    : [];

  const taskType: TaskTypeFilter =
    taskTypeParam === 'single' || taskTypeParam === 'recurring' ? taskTypeParam : null;

  const dueFilter: 'overdue' | 'dueSoon' | null =
    overdueParam === '1' ? 'overdue' : dueSoonParam === '1' ? 'dueSoon' : null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TaskView>(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'board' || saved === 'list' || saved === 'calendar') return saved;
    return window.matchMedia('(max-width: 640px)').matches ? 'list' : 'board';
  });
  const [viewTabs, setViewTabs] = useState<TaskView[]>(() => {
    try {
      const saved = localStorage.getItem(VIEW_TABS_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0 && arr.every((v: any) => ALL_VIEWS.includes(v))) return arr;
      }
    } catch {}
    return ALL_VIEWS;
  });
  const [viewsEditOpen, setViewsEditOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'views'>('main');
  const upcomingDays = useUpcomingDays();
  const infoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (e: Event) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [infoOpen]);


  const [createOpen, setCreateOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);

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
  }, [q, statusesParam, priorityParam, taskTypeParam, dateFrom, dateTo, sortParam, overdueParam, dueSoonParam]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(VIEW_TABS_KEY, JSON.stringify(viewTabs));
  }, [viewTabs]);

  useEffect(() => {
    if (newParam === '1') {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [newParam]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
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
      if (taskType) params.set('taskType', taskType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (sortParam) params.set('sort', sortParam);
      if (overdueParam === '1') params.set('overdue', 'true');
      if (dueSoonParam === '1') params.set('dueSoon', 'true');

      const url = '/api/tasks' + (params.toString() ? '?' + params.toString() : '');
      // Бэк (getTasks → enrichTaskDue) уже отдаёт pendingOccurrenceCount/nextOccurrenceDueAt.
      const tasksRes = await api.get(url);
      setTasks(tasksRes.data.tasks || []);
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

  const getStatusName = (statusId: string): string =>
    statuses.find((s) => s._id === statusId)?.name || 'Неизвестно';

  const getStatusColor = (statusId: string): string =>
    statuses.find((s) => s._id === statusId)?.color || 'var(--color-border)';

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
    setDueDate('');
    setIsRecurring(false);
    setRecurrence(null);
  };

  const isCreateFormDirty = (): boolean =>
    title.trim() !== '' ||
    description.trim() !== '' ||
    priority !== '' ||
    dueDate !== '' ||
    isRecurring;

  const handleCloseCreate = async () => {
    if (isCreateFormDirty()) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения будут потеряны. Закрыть форму?',
        confirmLabel: 'Закрыть',
        danger: true,
      });
      if (!ok) return;
    }
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priority === '') return;

    if (isRecurring) {
      if (!recurrence || !isRecurrenceValid(recurrence)) {
        alert('Заполните параметры повторения корректно');
        return;
      }
    }

    try {
      const payload: any = {
        title,
        description,
        priority,
      };

      if (isRecurring && recurrence) {
        payload.recurrence = recurrence;
        payload.dueDate = null;
      } else {
        payload.recurrence = null;
        payload.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
      }

      await api.post('/api/tasks', payload);
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
        if (idx >= 0) next[idx] = { ...next[idx], statusId: u.statusId, order: u.order };
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
    updateQuery({
      q: null, priority: null, statuses: null, taskType: null,
      dateFrom: null, dateTo: null, sort: null,
      overdue: null, dueSoon: null,
    });
    setSearchInput('');
  };

  const handleClearDueFilter = () => {
    updateQuery({ overdue: null, dueSoon: null });
  };

  const handleDateFromChange = (value: string) => {
    if (value && dateTo && value > dateTo) return;
    updateQuery({ dateFrom: value || null });
  };
  const handleDateToChange = (value: string) => {
    if (value && dateFrom && value < dateFrom) return;
    updateQuery({ dateTo: value || null });
  };
  const handleDatesClear = () => {
    updateQuery({ dateFrom: null, dateTo: null });
  };

  const dateError = (() => {
    if (dateFrom && dateTo && dateFrom > dateTo) return 'Дата «По» не может быть раньше даты «С»';
    return '';
  })();

  const hasActiveFilters = !!(
    q ||
    statusIds.length > 0 ||
    priorityFilter.length > 0 ||
    taskType ||
    dateFrom ||
    dateTo ||
    dueFilter ||
    (sortParam && sortParam !== DEFAULT_SORT)
  );

  const handleRefresh = async () => {
    await Promise.all([fetchStatuses(), fetchTasks()]);
  };

  if (loading) return <LoadingOverlay active text="Загрузка..." />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      <h2 className="page-title" style={{ margin: 0, marginBottom: 'var(--space-md)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Мои задачи
        {viewTabs.length === 1 && (
          <span className="view-info-wrap" ref={infoRef}>
            <button
              type="button"
              className="view-info-icon"
              aria-label={`Вид: ${VIEW_LABELS[viewTabs[0]]}`}
              onClick={() => setInfoOpen((v) => !v)}
            >
              <Info size={16} />
            </button>
            <span className={'view-info-tip' + (infoOpen ? ' view-info-tip--open' : '')}>
              Сейчас выбран только вид «{VIEW_LABELS[viewTabs[0]]}». Другие виды включаются в настройках.
            </span>
          </span>
        )}
      </h2>

      {/* Вкладки: несколько — отдельной строкой; одна — в строке действий */}
      {viewTabs.length > 1 && (
        <div className="view-toggle-row">
          <div className="view-toggle">
            {viewTabs.map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView(v)}
                title={VIEW_LABELS[v]}
              >
                {VIEW_ICONS[v]} {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Строка действий: (одна вкладка) + Добавить слева, настройки справа */}
      <div className="tasks-actions-row">
        <button
          type="button"
          className="button button--white"
          onClick={() => setCreateOpen(true)}
        >
          + Добавить задачу
        </button>
        <button
          type="button"
          className="icon-button settings-btn"
          onClick={() => { setSettingsView('main'); setViewsEditOpen(true); }}
          title="Настроить вкладки"
          aria-label="Настроить вкладки"
        >
          <Settings size={20} />
        </button>
      </div>

      <FilterBar
        q={searchInput}
        onQChange={setSearchInput}
        statusIds={statusIds}
        onStatusIdsChange={(ids) => updateQuery({ statuses: ids.length > 0 ? ids.join(',') : null })}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(priorities) => updateQuery({ priority: priorities.length > 0 ? priorities.join(',') : null })}
        taskType={taskType}
        onTaskTypeChange={(v) => updateQuery({ taskType: v })}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onDatesClear={handleDatesClear}
        statuses={statuses}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        dateError={dateError}
        sort={sortParam || DEFAULT_SORT}
        onSortChange={(s) => updateQuery({ sort: s === DEFAULT_SORT ? null : s })}
        defaultSort={DEFAULT_SORT}
        hideSort={view === 'board'}
        dueFilter={dueFilter}
        onDueFilterClear={handleClearDueFilter}
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

          <div>
            <label className="input-label">Тип задачи</label>
            <select
              className="input"
              value={isRecurring ? 'recurring' : 'single'}
              onChange={(e) => {
                const recurring = e.target.value === 'recurring';
                setIsRecurring(recurring);
                if (recurring && !recurrence) {
                  setRecurrence(getDefaultRecurrence('daily'));
                }
                if (!recurring) {
                  setRecurrence(null);
                }
              }}
            >
              <option value="single">Разовое</option>
              <option value="recurring">Повторяющееся</option>
            </select>
          </div>

          {isRecurring ? (
            <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          ) : (
            <div>
              <label className="input-label">Срок</label>
              <ClearableField onClear={() => setDueDate('')} showClear={!!dueDate}>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input"
                />
              </ClearableField>
            </div>
          )}

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
        onBack={() => { setStatusManagerOpen(false); setSettingsView('main'); setViewsEditOpen(true); }}
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

      {tasks.length > 0 && view === 'board' && (
        <KanbanBoard
          tasks={tasks as KanbanTask[]}
          statuses={statuses}
          onReorder={handleReorder}
          onOpenTask={openTask}
        />
      )}

      {tasks.length > 0 && view === 'list' && (
        <div>
          {tasks.map((task) => {
            // Для overdue/dueSoon показываем nextOccurrenceDueAt (дата самого срочного вхождения)
            // для повторяющихся, либо dueDate для разовых
            const displayDate = task.nextOccurrenceDueAt || task.dueDate;
            const st = statuses.find((s) => s._id === task.statusId);
            const isFinal = !!st && !!st.isFinal;

            return (
              <div
                key={task._id}
                className="task-card"
                onClick={() => openTask(task._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openTask(task._id); }}
              >
                <div className={'task-card-rail' + (isFinal ? ' task-card-rail--far' : (task.recurrence ? ((task.pendingOccurrenceCount || 0) > 0 ? ' task-card-rail--overdue' : ' task-card-rail--far') : (deadlineLevel(task.dueDate, upcomingDays) ? ' task-card-rail--' + deadlineLevel(task.dueDate, upcomingDays) : '')))} />
                <div className="task-card-content">
                  <h3 className="task-card-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-card-description">{task.description}</p>
                  )}
                  <div className="task-card-meta">
                    <span className="task-card-meta-item">
                      Приоритет: {getPriorityLabel(task.priority)}
                    </span>
                    <span className="task-card-meta-item">
                      Статус: {getStatusName(task.statusId)}
                    </span>

                    {displayDate && (
                      <span
                        className="task-card-meta-item"
                        style={!isFinal && isOverdue(displayDate) ? { color: 'var(--color-danger)', fontWeight: 500 } : undefined}
                      >
                        Срок до {formatDueDate(displayDate)}
                      </span>
                    )}
                    {task.recurrence && (
                      <span className="task-card-meta-item" style={{ whiteSpace: 'nowrap' }}>
                        🔄 {formatRecurrenceShort(task.recurrence)}
                        {(task.pendingOccurrenceCount || 0) > 0 && (
                          <span className={'task-pending-badge task-pending-badge--sm' + (isFinal ? ' task-pending-badge--final' : '')} style={{ marginLeft: 6 }}>
                            {task.pendingOccurrenceCount}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView tasks={tasks as any} finalStatusIds={statuses.filter((s) => s.isFinal).map((s) => s._id)} onOpenTask={openTask} />
      )}

      {viewsEditOpen && settingsView === 'main' && (
        <Modal open onClose={() => setViewsEditOpen(false)} title="Настройки задач">
          <button type="button" className="ve-action" onClick={() => setSettingsView('views')}>
            <LayoutList size={20} />
            <span>Виды отображения задач</span>
          </button>
          <button type="button" className="ve-action" style={{ marginTop: 8 }} onClick={() => { setViewsEditOpen(false); setStatusManagerOpen(true); }}>
            <Settings size={20} />
            <span>Управление статусами</span>
          </button>
        </Modal>
      )}

      {viewsEditOpen && settingsView === 'views' && (
        <Modal open onClose={() => setViewsEditOpen(false)} title="Виды отображения задач" onBack={() => setSettingsView('main')}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 0 }}>
            Включайте виды переключателем, меняйте порядок перетаскиванием за ручку.
          </p>
          <SortableSettings
            items={viewTabs.map((v) => ({ id: v, label: VIEW_LABELS[v], enabled: true }))}
            onToggle={(id) => {
              const next = viewTabs.filter((x) => x !== id);
              if (next.length === 0) return; // хотя бы одна включена
              setViewTabs(next);
              if (!next.includes(view)) setView(next[0]);
            }}
            onReorder={(ids) => setViewTabs(ids as TaskView[])}
            toggleAria="Скрыть вкладку"
          />

          {ALL_VIEWS.filter((v) => !viewTabs.includes(v)).length > 0 && (
            <>
              <div className="ve-subtitle">Скрытые</div>
              <div className="ve-list">
                {ALL_VIEWS.filter((v) => !viewTabs.includes(v)).map((v) => (
                  <div key={v} className="ve-row ve-row--hidden">
                    <span className="ve-handle ve-handle--off"><GripVertical size={18} /></span>
                    <span className="ve-label">{VIEW_LABELS[v]}</span>
                    <button
                      type="button"
                      className="ve-toggle"
                      onClick={() => setViewTabs([...viewTabs, v])}
                      role="switch"
                      aria-checked={false}
                      aria-label="Показать вкладку"
                    >
                      <span className="ve-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

        </Modal>
      )}
    </div>
    </PullToRefresh>
  );
};

export default Tasks;