import React, { useState, useEffect } from 'react';
import { Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { deadlineLevel } from '../utils/date';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

interface CalendarTask {
  _id: string;
  title: string;
  dueDate?: string | null;
  nextOccurrenceDueAt?: string | null;
  lastOverdueAt?: string | null;
  recurrence?: any;
  pendingOccurrenceCount?: number;
  priority?: number;
  statusId?: string;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  finalStatusIds?: string[];
  onOpenTask: (id: string) => void;
  /** F1b: перенос дедлайна разовой задачи. Возвращает true при успехе. */
  onTaskMoved?: (id: string, newDueDate: string) => Promise<boolean>;
  /** F1c: действие над вхождением повторяющейся (открыть диалог). */
  onOccurrenceAction?: (taskId: string, originalDate: string) => void;
  /** F1c: перенос вхождения повторяющейся на дату (открыть диалог move со scope). */
  onOccurrenceMove?: (taskId: string, originalDate: string, newDue: string) => void;
}

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const startOfWeek = (d: Date) => { const s = startOfDay(d); const off = (s.getDay() + 6) % 7; return addDays(s, -off); };
const dayKey = (d: Date) => `day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const taskDate = (t: CalendarTask): Date | null => {
  const raw = t.nextOccurrenceDueAt || t.dueDate;
  return raw ? new Date(raw) : null;
};
const isRecurring = (t: CalendarTask) => !!(t.recurrence && t.recurrence.freq);

// Собрать новую дату: берём день из дропа, время — из старого dueDate (или 00:00, если было без времени)
function buildNewDue(task: CalendarTask, dropDay: Date): string {
  const old = task.dueDate ? new Date(task.dueDate) : null;
  const d = new Date(dropDay);
  if (old && !isNaN(old.getTime())) {
    d.setHours(old.getHours(), old.getMinutes(), old.getSeconds(), 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

// ==== Droppable ячейка дня ====
const DayCell: React.FC<{
  day: Date;
  isToday: boolean;
  isSelected: boolean;
  hasTasks: boolean;
  onClick: () => void;
  variant: 'month' | 'week';
  children?: React.ReactNode;
}> = ({ day, isToday, isSelected, hasTasks, onClick, variant, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day) });

  if (variant === 'week') {
    return (
      <button
        ref={setNodeRef}
        type="button"
        className={'calendar-week-day' + (isToday ? ' calendar-week-day--today' : '') + (isSelected ? ' calendar-week-day--selected' : '') + (isOver ? ' calendar-week-day--over' : '')}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={'calendar-cell' + (isToday ? ' calendar-cell--today' : '') + (isSelected ? ' calendar-cell--selected' : '') + (isOver ? ' calendar-cell--over' : '')}
      onClick={onClick}
    >
      {children}
      {hasTasks && (
        <span className="calendar-dots">
          <span className="calendar-dot" />
        </span>
      )}
    </button>
  );
};

// ==== Draggable карточка задачи ====
const formatTime = (d: Date | null): string | null => {
  if (!d) return null;
  // полночь считаем «без времени» (all-day)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const DraggableTask: React.FC<{
  task: CalendarTask;
  day: Date;
  getDayDate: (t: CalendarTask, day: Date) => Date | null;
  onOpen: () => void;
  onAction?: () => void;
}> = ({ task, day, getDayDate, onOpen, onAction }) => {
  const recurring = isRecurring(task);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `task-${task._id}`,
    data: { taskId: task._id },
  });

  const dayDate = getDayDate(task, day);
  const time = formatTime(dayDate);

  // Цвет по дедлайну (как в списке/доске): overdue/soon/far
  const lvl = deadlineLevel(dayDate ? dayDate.toISOString() : null, 3) || 'far';

  return (
    <div
      ref={setNodeRef}
      className={'calendar-task' + (isDragging ? ' calendar-task--dragging' : '') + (recurring ? ' calendar-task--locked' : '')}
      onClick={() => (recurring && onAction ? onAction() : onOpen())}
      role="button"
      tabIndex={0}
      title={recurring ? 'Действия над вхождением' : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (recurring && onAction ? onAction() : onOpen()); } }}
    >
      <span
        ref={setActivatorNodeRef}
        className="calendar-task-grip"
        title="Перетащить на другой день"
        onClick={(e) => e.stopPropagation()}
        {...listeners}
        {...attributes}
      >⠿</span>
      <span className={'calendar-task-rail calendar-task-rail--' + lvl} />
      {recurring && <span className="calendar-task-lock" title="Повторяющаяся"><Repeat size={14} className="recur-icon" /></span>}
      <span className="calendar-task-title">{task.title}</span>
      {time && <span className="calendar-task-time">{time}</span>}
    </div>
  );
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, finalStatusIds = [], onOpenTask, onTaskMoved, onOccurrenceAction, onOccurrenceMove }) => {
  const finalSet = new Set(finalStatusIds.map((x) => String(x)));
  const today = startOfDay(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [activeTask, setActiveTask] = useState<CalendarTask | null>(null);
  const [markDays, setMarkDays] = useState<Set<string>>(new Set());
  const [itemsByDay, setItemsByDay] = useState<Record<string, Array<{ taskId: string; title: string; dueAt: string; priority?: number; isRecurring: boolean; originalDate: string | null }>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Дата/время, по которым задача показана в конкретном дне (для сортировки и подписи времени)
  const dateForDay = (t: CalendarTask, day: Date): Date | null => {
    if (t.recurrence && t.lastOverdueAt) {
      const od = new Date(t.lastOverdueAt);
      if (!isNaN(od.getTime()) && sameDay(od, day)) return od;
    }
    const td = taskDate(t);
    return td && sameDay(td, day) ? td : null;
  };

  const tasksByDay = (day: Date) => tasks.filter((t) => dateForDay(t, day) !== null);

  // День (локальный ключ yyyy-mm-dd) для набора маркеров; маркеры с сервера (независимо от фильтров).
  const dayKeyStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hasMark = (day: Date) => markDays.has(dayKeyStr(day));

  useEffect(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    api.get(`/api/tasks/calendar-marks?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r: any) => { setMarkDays(new Set(r.data?.days || [])); setItemsByDay(r.data?.itemsByDay || {}); })
      .catch(() => {});
  }, [cursor, tasks]);

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
      setCursor(d); setSelected(d);
    } else if (view === 'week') {
      const d = addDays(cursor, dir * 7); setCursor(d); setSelected(d);
    } else {
      const d = addDays(cursor, dir); setCursor(d); setSelected(d);
    }
  };

  const goToday = () => { setCursor(today); setSelected(today); };

  const switchView = (v: ViewMode) => {
    setView(v);
    setCursor(v === 'month' ? new Date(selected.getFullYear(), selected.getMonth(), 1) : selected);
  };

  const title = (() => {
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === 'week') {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      return sameMonth
        ? `${s.getDate()}–${e.getDate()} ${MONTHS_GEN[s.getMonth()]} ${s.getFullYear()}`
        : `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} – ${e.getDate()} ${MONTHS_GEN[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${selected.getDate()} ${MONTHS_GEN[selected.getMonth()]} ${selected.getFullYear()}`;
  })();

  // ==== DnD ====
  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id).replace('task-', '');
    setActiveTask(tasks.find((t) => t._id === id) || null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over || !onTaskMoved) return;
    const taskId = String(active.id).replace('task-', '');
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const overId = String(over.id);
    if (!overId.startsWith('day-')) return;
    const [, y, m, d] = overId.split('-').map((x) => parseInt(x, 10));
    const dropDay = new Date(y, m, d);

    // Повторяющаяся: открыть диалог move со scope (F1c), не переносить сразу
    if (isRecurring(task)) {
      if (!onOccurrenceMove) return;
      const orig = taskDate(task);
      if (!orig) return;
      if (sameDay(orig, dropDay)) return;
      const iso = buildNewDue(task, dropDay);
      onOccurrenceMove(task._id, orig.toISOString(), iso);
      return;
    }

    if (!onTaskMoved) return;
    // Дроп на тот же день — ничего
    const oldDate = task.dueDate ? new Date(task.dueDate) : null;
    if (oldDate && sameDay(oldDate, dropDay)) return;

    const newDue = buildNewDue(task, dropDay);
    await onTaskMoved(task._id, newDue);
  };

  // ==== месяц ====
  const renderMonth = () => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={'e' + i} className="calendar-cell calendar-cell--empty" />;
          const hasTasks = hasMark(day);
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              isToday={sameDay(day, today)}
              isSelected={sameDay(day, selected)}
              hasTasks={hasTasks}
              onClick={() => setSelected(day)}
              variant="month"
            >
              <span className="calendar-daynum">{day.getDate()}</span>
            </DayCell>
          );
        })}
      </div>
    );
  };

  // ==== неделя ====
  const renderWeek = () => {
    const start = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <div className="calendar-week">
        {days.map((day) => {
          const hasTasks = hasMark(day);
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              isToday={sameDay(day, today)}
              isSelected={sameDay(day, selected)}
              hasTasks={hasTasks}
              onClick={() => setSelected(day)}
              variant="week"
            >
              <span className="calendar-week-dayname">{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
              <span className="calendar-week-daynum">{day.getDate()}</span>
              {hasTasks && (
                <span className="calendar-dots">
                  <span className="calendar-dot" />
                </span>
              )}
            </DayCell>
          );
        })}
      </div>
    );
  };

  // ==== панель выбранного дня ====
  const selectedTasks = [...tasksByDay(selected)].sort((a, b) => {
    const da = dateForDay(a, selected); const db = dateForDay(b, selected);
    const ta = da ? da.getTime() : Infinity;
    const tb = db ? db.getTime() : Infinity;
    return ta - tb;
  });
  const selectedItems = (itemsByDay[dayKeyStr(selected)] || []).slice().sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const renderDayPanel = () => (
    <div className="calendar-day-panel">
      <div className="calendar-day-title">
        {view === 'day'
          ? `${WEEKDAYS_FULL[(selected.getDay() + 6) % 7]}, ${selected.getDate()} ${MONTHS_GEN[selected.getMonth()]}`
          : `${selected.getDate()} ${MONTHS_GEN[selected.getMonth()]}`}
      </div>
      {selectedItems.length === 0 ? (
        <div className="calendar-empty">На этот день задач нет</div>
      ) : (
        selectedItems.map((it: any) => (
          <div
            key={(it.taskId || '') + (it.originalDate || it.dueAt)}
            className="calendar-task"
            onClick={() => it.isRecurring && onOccurrenceAction && it.originalDate
              ? onOccurrenceAction(it.taskId, it.originalDate)
              : onOpenTask(it.taskId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTask(it.taskId); } }}
          >
            <span className={'calendar-task-rail calendar-task-rail--' + (deadlineLevel(it.dueAt, 3) || 'far')} />
            {it.isRecurring && <Repeat size={14} className="recur-icon" />}
            <span className="calendar-task-title">{it.title}</span>
            <span className="calendar-task-time">{new Date(it.dueAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <DndContext sensors={sensors} accessibility={{ restoreFocus: false }} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="calendar">
        {/* Карточка календаря */}
        <div className="calendar-card">
          <div className="calendar-card-header">
            <div className="calendar-viewswitch">
              {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={'calendar-viewswitch-btn' + (view === v ? ' calendar-viewswitch-btn--active' : '')}
                  onClick={() => switchView(v)}
                >
                  {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : 'День'}
                </button>
              ))}
            </div>
            <div className="calendar-title">{title}</div>
          </div>

          <div className="calendar-card-body">
            <div className="calendar-nav-row">
              <button type="button" className="calendar-nav" onClick={() => navigate(-1)} aria-label="Назад"><ChevronLeft size={20} /></button>
              <button type="button" className="calendar-today-btn" onClick={goToday}>Сегодня</button>
              <button type="button" className="calendar-nav" onClick={() => navigate(1)} aria-label="Вперёд"><ChevronRight size={20} /></button>
            </div>

            {view !== 'day' && (
              <div className="calendar-weekdays">
                {WEEKDAYS.map((w) => <div key={w} className="calendar-weekday">{w}</div>)}
              </div>
            )}

            {view === 'month' && renderMonth()}
            {view === 'week' && renderWeek()}
          </div>
        </div>

        {/* Задачи дня — отдельная карточка */}
        {renderDayPanel()}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="calendar-task calendar-task--overlay">
            <span className={'calendar-task-priority calendar-task-priority--' + (activeTask.priority || 1)} />
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarView;
