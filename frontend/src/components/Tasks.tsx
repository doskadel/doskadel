import React, { useState, useEffect } from 'react';
import PullToRefresh from './PullToRefresh';
import LoadingOverlay from './LoadingOverlay';
import CalendarView from './CalendarView';
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus, Settings } from 'lucide-react';

interface SortableViewRowProps {
  id: TaskView;
  label: string;
  onHide: () => void;
}

const SortableViewRow: React.FC<SortableViewRowProps> = ({ id, label, onHide }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="views-edit-row">
      <button type="button" className="views-edit-handle" {...attributes} {...listeners} aria-label="Перетащить">
        <GripVertical size={18} />
      </button>
      <span className="views-edit-label">{label}</span>
      <button type="button" className="views-edit-remove" onClick={onHide} aria-label="Скрыть">
        <X size={16} />
      </button>
    </div>
  );
};
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
import { PRIORITY_OPTIONS, getPriorityLabel, getPriorityColor } from '../utils/priority';
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
const VIEW_LABELS: Record<TaskView, string> = { calendar: '📅 Календарь', board: '▦ Доска', list: '☰ Список' };

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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleViewsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = viewTabs.indexOf(active.id as TaskView);
    const newIndex = viewTabs.indexOf(over.id as TaskView);
    if (oldIndex < 0 || newIndex < 0) return;
    setViewTabs(arrayMove(viewTabs, oldIndex, newIndex));
  };

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
      const [tasksRes, pendingRes] = await Promise.all([
        api.get(url),
        api.get('/api/occurrences/pending'),
      ]);

      const now = Date.now();
      const counts: Record<string, number> = {};
      (pendingRes.data.occurrences || []).forEach((o: any) => {
        if (new Date(o.dueAt).getTime() <= now) {
          counts[o.taskId] = (counts[o.taskId] || 0) + 1;
        }
      });

      const enriched = (tasksRes.data.tasks || []).map((t: Task) => ({
        ...t,
        pendingOccurrenceCount: counts[t._id] || 0,
      }));

      setTasks(enriched);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Мои задачи</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="view-toggle">
            {viewTabs.map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? 'view-toggle-btn view-toggle-btn--active' : 'view-toggle-btn'}
                onClick={() => setView(v)}
                title={VIEW_LABELS[v].replace(/^\S+\s/, '')}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
            <button
              type="button"
              className="view-toggle-btn view-toggle-edit"
              onClick={() => setViewsEditOpen(true)}
              title="Настроить вкладки"
              aria-label="Настроить вкладки"
            >
              ⚙
            </button>
          </div>
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

            return (
              <div
                key={task._id}
                className="task-card"
                onClick={() => openTask(task._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openTask(task._id); }}
              >
                <div
                  className="task-card-status-rail"
                  style={{ backgroundColor: getStatusColor(task.statusId) }}
                />
                <div className="task-card-content">
                  <h3 className="task-card-title">{task.title}</h3>
                  {task.description && (
                    <p className="task-card-description">{task.description}</p>
                  )}
                  <div className="task-card-meta">
                    <span className="task-card-meta-item">
                      <span
                        className="task-card-priority-dot"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      />
                      Приоритет: {getPriorityLabel(task.priority)}
                    </span>
                    <span className="task-card-meta-item">
                      Статус: {getStatusName(task.statusId)}
                    </span>

                    {task.recurrence ? (
                      <>
                        <span className="task-card-meta-item">
                          🔄 {formatRecurrenceShort(task.recurrence)}
                        </span>
                        {dueFilter && displayDate && (
                          <span
                            className="task-card-meta-item"
                            style={{
                              color: dueFilter === 'overdue' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                              fontWeight: dueFilter === 'overdue' ? 500 : 400,
                            }}
                          >
                            {dueFilter === 'overdue' ? 'Просрочено до' : 'Срок до'} {formatDueDate(displayDate)}
                          </span>
                        )}
                        {(task.pendingOccurrenceCount || 0) > 0 && !dueFilter && (
                          <span className="task-pending-badge task-pending-badge--sm">
                            {task.pendingOccurrenceCount}
                          </span>
                        )}
                      </>
                    ) : (
                      dueFilter && displayDate ? (
                        <span
                          className="task-card-meta-item"
                          style={{
                            color: dueFilter === 'overdue' ? 'var(--color-danger)' : 'var(--color-text-muted)',
                            fontWeight: dueFilter === 'overdue' ? 500 : 400,
                          }}
                        >
                          {dueFilter === 'overdue' ? 'Просрочено до' : 'Срок до'} {formatDueDate(displayDate)}
                        </span>
                      ) : (
                        task.dueDate && isOverdue(task.dueDate) && (
                          <span
                            className="task-card-meta-item"
                            style={{ color: 'var(--color-danger)', fontWeight: 500 }}
                          >
                            Срок до {formatDueDate(task.dueDate)}
                          </span>
                        )
                      )
                    )}

                    <span className="task-card-meta-item">
                      Создано: {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView tasks={tasks as any} onOpenTask={openTask} />
      )}

      {viewsEditOpen && (
        <Modal open onClose={() => setViewsEditOpen(false)} title="Настройки задач">
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 0 }}>
            Показывайте и перетаскивайте вкладки (за ручку ⋮⋮).
          </p>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleViewsDragEnd}
          >
            <SortableContext items={viewTabs} strategy={verticalListSortingStrategy}>
              <div className="views-edit-list">
                {viewTabs.map((v) => (
                  <SortableViewRow
                    key={v}
                    id={v}
                    label={VIEW_LABELS[v]}
                    onHide={() => {
                      const next = viewTabs.filter((x) => x !== v);
                      if (next.length === 0) return;
                      setViewTabs(next);
                      if (!next.includes(view)) setView(next[0]);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {ALL_VIEWS.filter((v) => !viewTabs.includes(v)).length > 0 && (
            <>
              <div className="views-edit-subtitle">Скрытые</div>
              {ALL_VIEWS.filter((v) => !viewTabs.includes(v)).map((v) => (
                <button
                  key={v}
                  type="button"
                  className="views-edit-add"
                  onClick={() => setViewTabs([...viewTabs, v])}
                >
                  <Plus size={16} /> {VIEW_LABELS[v]}
                </button>
              ))}
            </>
          )}

          <div className="views-edit-divider" />
          <button type="button" className="views-edit-add" onClick={() => { setViewsEditOpen(false); setStatusManagerOpen(true); }}>
            <Settings size={16} /> Управление статусами
          </button>

          <div style={{ marginTop: 'var(--space-lg)', textAlign: 'right' }}>
            <button type="button" className="button" onClick={() => setViewsEditOpen(false)}>Готово</button>
          </div>
        </Modal>
      )}
    </div>
    </PullToRefresh>
  );
};

export default Tasks;