import React, { useState } from 'react';

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
}

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
// Понедельник — начало недели
const startOfWeek = (d: Date) => { const s = startOfDay(d); const off = (s.getDay() + 6) % 7; return addDays(s, -off); };

const taskDate = (t: CalendarTask): Date | null => {
  const raw = t.nextOccurrenceDueAt || t.dueDate;
  return raw ? new Date(raw) : null;
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, finalStatusIds = [], onOpenTask }) => {
  const finalSet = new Set(finalStatusIds);
  const today = startOfDay(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  // Задачи на конкретный день (повторяющиеся — на день последней неподтверждённой просрочки)
  const tasksByDay = (day: Date) => tasks.filter((t) => {
    if (t.recurrence && t.lastOverdueAt) {
      const od = new Date(t.lastOverdueAt);
      return !isNaN(od.getTime()) && sameDay(od, day);
    }
    const td = taskDate(t);
    return td && sameDay(td, day);
  });

  const isOverdueForDay = (t: CalendarTask, day: Date) => {
    if (t.statusId && finalSet.has(t.statusId)) return false;
    if (t.recurrence && t.lastOverdueAt) {
      const d = new Date(t.lastOverdueAt);
      return !isNaN(d.getTime()) && sameDay(d, day);
    }
    const d = taskDate(t);
    return d && d.getTime() < Date.now();
  };

  // ==== навигация ====
  const navigate = (dir: -1 | 1) => {
    if (view === 'month') {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
      setCursor(d);
      setSelected(d);
    } else if (view === 'week') {
      const d = addDays(cursor, dir * 7);
      setCursor(d);
      setSelected(d);
    } else {
      const d = addDays(cursor, dir);
      setCursor(d);
      setSelected(d);
    }
  };

  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  const switchView = (v: ViewMode) => {
    setView(v);
    // при смене вида курсор — на выбранный день
    setCursor(v === 'month' ? new Date(selected.getFullYear(), selected.getMonth(), 1) : selected);
  };

  // ==== заголовок ====
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
          const dayTasks = tasksByDay(day);
          const overdueCount = dayTasks.filter((t) => isOverdueForDay(t, day)).length;
          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={'calendar-cell' + (isToday ? ' calendar-cell--today' : '') + (isSelected ? ' calendar-cell--selected' : '')}
              onClick={() => setSelected(day)}
            >
              <span className="calendar-daynum">{day.getDate()}</span>
              {overdueCount > 0 && (
                <span className="calendar-dots">
                  <span className="calendar-dot calendar-dot--overdue" />
                </span>
              )}
            </button>
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
          const overdueCount = tasksByDay(day).filter((t) => isOverdueForDay(t, day)).length;
          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={'calendar-week-day' + (isToday ? ' calendar-week-day--today' : '') + (isSelected ? ' calendar-week-day--selected' : '')}
              onClick={() => setSelected(day)}
            >
              <span className="calendar-week-dayname">{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
              <span className="calendar-week-daynum">{day.getDate()}</span>
              {overdueCount > 0 && (
                <span className="calendar-dots">
                  <span className="calendar-dot calendar-dot--overdue" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // ==== панель выбранного дня ====
  const selectedTasks = tasksByDay(selected);
  const renderDayPanel = () => (
    <div className="calendar-day-panel">
      <div className="calendar-day-title">
        {view === 'day'
          ? `${WEEKDAYS_FULL[(selected.getDay() + 6) % 7]}, ${selected.getDate()} ${MONTHS_GEN[selected.getMonth()]}`
          : `${selected.getDate()} ${MONTHS_GEN[selected.getMonth()]}`}
      </div>
      {selectedTasks.length === 0 ? (
        <div className="calendar-empty">На этот день задач нет</div>
      ) : (
        selectedTasks.map((t) => (
          <div key={t._id} className="calendar-task" onClick={() => onOpenTask(t._id)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpenTask(t._id); }}>
            <span className={'calendar-task-priority calendar-task-priority--' + (t.priority || 1)} />
            {t.title}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="calendar">
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

      <div className="calendar-header">
        <div className="calendar-title">{title}</div>
        <div className="calendar-nav-row">
          <button type="button" className="calendar-nav" onClick={() => navigate(-1)} aria-label="Назад">‹</button>
          <button type="button" className="calendar-today-btn" onClick={goToday}>Сегодня</button>
          <button type="button" className="calendar-nav" onClick={() => navigate(1)} aria-label="Вперёд">›</button>
        </div>
      </div>

      {view !== 'day' && (
        <div className="calendar-weekdays">
          {WEEKDAYS.map((w) => <div key={w} className="calendar-weekday">{w}</div>)}
        </div>
      )}

      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {renderDayPanel()}
    </div>
  );
};

export default CalendarView;
