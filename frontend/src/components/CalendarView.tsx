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

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const taskDate = (t: CalendarTask): Date | null => {
  const raw = t.nextOccurrenceDueAt || t.dueDate;
  return raw ? new Date(raw) : null;
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, finalStatusIds = [], onOpenTask }) => {
  const finalSet = new Set(finalStatusIds);
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  // Пн=0 ... Вс=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const tasksByDay = (day: Date) => tasks.filter((t) => {
    const td = taskDate(t);
    return td && sameDay(td, day);
  });

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); };

  const selectedTasks = tasksByDay(selected);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={prevMonth} aria-label="Предыдущий месяц">‹</button>
        <div className="calendar-title">{MONTHS[month]} {year}</div>
        <button type="button" className="calendar-nav" onClick={nextMonth} aria-label="Следующий месяц">›</button>
        <button type="button" className="calendar-today-btn" onClick={goToday}>Сегодня</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => <div key={w} className="calendar-weekday">{w}</div>)}
      </div>

      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={'e' + i} className="calendar-cell calendar-cell--empty" />;
          const dayTasks = tasksByDay(day);
          const overdueCount = dayTasks.filter((t) => {
            if (t.statusId && finalSet.has(t.statusId)) return false;
            // повторяющиеся: точка на дне ПОСЛЕДНЕЙ неподтверждённой просрочки
            if (t.recurrence && t.lastOverdueAt) {
              const d = new Date(t.lastOverdueAt);
              return !isNaN(d.getTime()) && sameDay(d, day);
            }
            const d = taskDate(t);
            return d && d.getTime() < Date.now();
          }).length;
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
                  {Array.from({ length: Math.min(overdueCount, 3) }).map((_, k) => <span key={k} className="calendar-dot calendar-dot--overdue" />)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-day-panel">
        <div className="calendar-day-title">
          {selected.getDate()} {MONTHS[selected.getMonth()].toLowerCase()}
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
    </div>
  );
};

export default CalendarView;
