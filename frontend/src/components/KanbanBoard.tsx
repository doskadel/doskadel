import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Status } from '../utils/status';
import { formatDueDate, isOverdue, deadlineLevel } from '../utils/date';
import { useUpcomingDays } from '../hooks/useUpcomingDays';
import { Repeat } from 'lucide-react';
import { Recurrence, formatRecurrenceShort } from '../utils/recurrence';

export interface KanbanTask {
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
  occurrenceStatus?: 'pending' | 'overdue';
  createdAt: string;
}

const getTextColorForBackground = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? '#1f2328' : '#ffffff';
};

interface DraggableTaskProps {
  task: KanbanTask;
  statusColor: string;
  statusIsFinal?: boolean;
  onOpenTask: (id: string) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, statusColor, statusIsFinal, onOpenTask }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { type: 'task', statusId: task.statusId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isFinal = !!statusIsFinal;
  const overdue = !isFinal && isOverdue(task.dueDate);
  const isRecurring = !!task.recurrence;
  const pendingCount = task.pendingOccurrenceCount || 0;
  const upcomingDays = useUpcomingDays();
  const dl = isFinal
    ? 'far'
    : (isRecurring
      ? (pendingCount > 0 ? 'overdue' : 'far')
      : deadlineLevel(task.dueDate, upcomingDays));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      {...listeners}
      {...attributes}
    >
      <div
        className={'kanban-card-rail' + (dl ? ' kanban-card-rail--' + dl : '')}
      />
      <div className="kanban-card-content">
        <div className="kanban-card-row">
          <a
            href={`/tasks?task=${task._id}`}
            className="kanban-card-title"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                if (!isDragging) {
                  onOpenTask(task._id);
                }
              }
            }}
          >
            {task.title}
          </a>
        </div>

        {isRecurring && (
          <div className="kanban-card-recurring">
            <span className="kanban-card-recurring-label">
              <Repeat size={14} className="recur-icon" /> {formatRecurrenceShort(task.recurrence)}
            </span>
            {pendingCount > 0 && (
              <span className={'task-pending-badge task-pending-badge--sm' + (isFinal ? ' task-pending-badge--final' : '')}>
                {pendingCount}
              </span>
            )}
          </div>
        )}
        {isRecurring && task.nextOccurrenceDueAt && (
          <div className={'kanban-card-due' + (pendingCount > 0 ? ' kanban-card-due--overdue' : '')}>
            Ближайшее: {formatDueDate(task.nextOccurrenceDueAt)}
          </div>
        )}

        {!isRecurring && task.dueDate && overdue && (
          <div className="kanban-card-due kanban-card-due--overdue">
            Срок до {formatDueDate(task.dueDate)}
          </div>
        )}
      </div>
    </div>
  );
};

interface ColumnProps {
  status: Status;
  tasks: KanbanTask[];
  onOpenTask: (id: string) => void;
}

const Column: React.FC<ColumnProps> = ({ status, tasks, onOpenTask }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status._id,
    data: { type: 'column', statusId: status._id },
  });

  const taskIds = tasks.map((t) => t._id);
  const headerTextColor = getTextColorForBackground(status.color);

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}
    >
      <div
        className="kanban-column-header"
        style={{ backgroundColor: status.color }}
      >
        <h3 className="kanban-column-title" style={{ color: headerTextColor }}>
          {status.name}
        </h3>
        <span
          className="kanban-column-count"
          style={{
            color: headerTextColor,
            borderColor: headerTextColor,
            backgroundColor: 'transparent',
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div className="kanban-column-body">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="kanban-empty">Пусто</p>
          ) : (
            tasks.map((task) => (
              <DraggableTask
                key={task._id}
                task={task}
                statusColor={status.color}
                statusIsFinal={status.isFinal}
                onOpenTask={onOpenTask}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  tasks: KanbanTask[];
  statuses: Status[];
  onReorder: (updates: Array<{ id: string; statusId: string; order: number }>) => void;
  onOpenTask: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, statuses, onReorder, onOpenTask }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;
  const activeStatus = activeTask
    ? statuses.find((s) => s._id === activeTask.statusId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const activeTaskData = tasks.find((t) => t._id === activeTaskId);
    if (!activeTaskData) return;

    const overId = over.id as string;

    const overTask = tasks.find((t) => t._id === overId);
    const overStatusId = overTask
      ? overTask.statusId
      : statuses.find((s) => s._id === overId)?._id;

    if (!overStatusId) return;

    const sourceStatusId = activeTaskData.statusId;

    if (sourceStatusId !== overStatusId) {
      const targetTasks = tasks
        .filter((t) => t.statusId === overStatusId)
        .sort((a, b) => a.order - b.order);

      let insertIndex = targetTasks.length;
      if (overTask && overTask._id !== activeTaskId) {
        const idx = targetTasks.findIndex((t) => t._id === overTask._id);
        if (idx >= 0) insertIndex = idx;
      }

      const newTargetList = [...targetTasks];
      newTargetList.splice(insertIndex, 0, { ...activeTaskData, statusId: overStatusId });

      const updates: Array<{ id: string; statusId: string; order: number }> = [];

      newTargetList.forEach((t, idx) => {
        updates.push({ id: t._id, statusId: overStatusId, order: idx });
      });

      const sourceTasks = tasks
        .filter((t) => t.statusId === sourceStatusId && t._id !== activeTaskId)
        .sort((a, b) => a.order - b.order);
      sourceTasks.forEach((t, idx) => {
        updates.push({ id: t._id, statusId: sourceStatusId, order: idx });
      });

      onReorder(updates);
      return;
    }

    if (sourceStatusId === overStatusId) {
      const columnTasks = tasks
        .filter((t) => t.statusId === sourceStatusId)
        .sort((a, b) => a.order - b.order);

      const oldIndex = columnTasks.findIndex((t) => t._id === activeTaskId);
      if (oldIndex < 0) return;

      if (overTask && overTask._id !== activeTaskId) {
        const newIndex = columnTasks.findIndex((t) => t._id === overTask._id);
        if (newIndex < 0 || oldIndex === newIndex) return;

        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const updates = reordered.map((t, idx) => ({
          id: t._id,
          statusId: sourceStatusId,
          order: idx,
        }));
        onReorder(updates);
        return;
      }

      if (overId === sourceStatusId) {
        if (oldIndex === columnTasks.length - 1) return;

        const reordered = arrayMove(columnTasks, oldIndex, columnTasks.length - 1);
        const updates = reordered.map((t, idx) => ({
          id: t._id,
          statusId: sourceStatusId,
          order: idx,
        }));
        onReorder(updates);
      }
    }
  };

  if (statuses.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>У вас нет статусов. Создайте хотя бы один.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {statuses.map((status) => (
          <Column
            key={status._id}
            status={status}
            tasks={tasks
              .filter((t) => t.statusId === status._id)
              .sort((a, b) => a.order - b.order)}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="kanban-card kanban-card--overlay">
            <div className="kanban-card-rail" />
            <div className="kanban-card-content">
              <div className="kanban-card-row">
                <span className="kanban-card-title">{activeTask.title}</span>
              </div>
              {activeTask.recurrence && (
                <div className="kanban-card-recurring">
                  <span className="kanban-card-recurring-label">
                    <Repeat size={14} className="recur-icon" /> {formatRecurrenceShort(activeTask.recurrence)}
                  </span>
                </div>
              )}
              {!activeTask.recurrence && activeTask.dueDate && isOverdue(activeTask.dueDate) && (
                <div className="kanban-card-due kanban-card-due--overdue">
                  Срок до {formatDueDate(activeTask.dueDate)}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;