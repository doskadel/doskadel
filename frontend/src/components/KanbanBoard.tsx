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
import { getPriorityColor } from '../utils/priority';
import { Status } from '../utils/status';

export interface KanbanTask {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  order: number;
  createdAt: string;
}

interface DraggableTaskProps {
  task: KanbanTask;
  onOpenTask: (id: string) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, onOpenTask }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { type: 'task', statusId: task.statusId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="kanban-card" {...listeners} {...attributes}>
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
        <span
          className="kanban-card-priority"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
          title={`Приоритет: ${task.priority}`}
        />
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

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}
    >
      <div
        className="kanban-column-header"
        style={{ borderTop: `4px solid ${status.color}` }}
      >
        <h3 className="kanban-column-title">{status.name}</h3>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>
      <div className="kanban-column-body">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <p className="kanban-empty">Пусто</p>
          ) : (
            tasks.map((task) => (
              <DraggableTask key={task._id} task={task} onOpenTask={onOpenTask} />
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

    // Куда попали: задача или колонка?
    const overTask = tasks.find((t) => t._id === overId);
    const overStatusId = overTask
      ? overTask.statusId
      : statuses.find((s) => s._id === overId)?._id;

    if (!overStatusId) return;

    const sourceStatusId = activeTaskData.statusId;

    // 1. Перетащили в другую колонку
    if (sourceStatusId !== overStatusId) {
      const targetTasks = tasks
        .filter((t) => t.statusId === overStatusId)
        .sort((a, b) => a.order - b.order);

      // Куда вставить: перед задачей overTask или в конец
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

    // 2. Внутри той же колонки
    if (sourceStatusId === overStatusId) {
      const columnTasks = tasks
        .filter((t) => t.statusId === sourceStatusId)
        .sort((a, b) => a.order - b.order);

      const oldIndex = columnTasks.findIndex((t) => t._id === activeTaskId);
      if (oldIndex < 0) return;

      // 2a. Drop на другую задачу — вставка на её место
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

      // 2b. Drop на пустое место колонки (overId === statusId) — в конец
      if (overId === sourceStatusId) {
        if (oldIndex === columnTasks.length - 1) return; // уже в конце

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
            <div className="kanban-card-row">
              <span className="kanban-card-title">{activeTask.title}</span>
              <span
                className="kanban-card-priority"
                style={{ backgroundColor: getPriorityColor(activeTask.priority) }}
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;