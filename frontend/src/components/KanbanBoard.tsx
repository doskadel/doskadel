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
  useDraggable,
} from '@dnd-kit/core';
import { getPriorityColor } from '../utils/priority';

export interface KanbanTask {
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

const statusOrder: Array<KanbanTask['status']> = ['pending', 'in_progress', 'completed', 'cancelled'];

interface DraggableTaskProps {
  task: KanbanTask;
  onOpenTask: (id: string) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, onOpenTask }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="kanban-card" {...listeners} {...attributes}>
      <div className="kanban-card-row">
        <span
          className="kanban-card-title"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) {
              onOpenTask(task._id);
            }
          }}
        >
          {task.title}
        </span>
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
  status: KanbanTask['status'];
  tasks: KanbanTask[];
  onOpenTask: (id: string) => void;
}

const Column: React.FC<ColumnProps> = ({ status, tasks, onOpenTask }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}
    >
      <div className="kanban-column-header">
        <h3 className="kanban-column-title">{statusMap[status]}</h3>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>
      <div className="kanban-column-body">
        {tasks.length === 0 ? (
          <p className="kanban-empty">Пусто</p>
        ) : (
          tasks.map((task) => (
            <DraggableTask key={task._id} task={task} onOpenTask={onOpenTask} />
          ))
        )}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onChangeStatus: (taskId: string, newStatus: KanbanTask['status']) => void;
  onOpenTask: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onChangeStatus, onOpenTask }) => {
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

    const taskId = active.id as string;
    const newStatus = over.id as KanbanTask['status'];
    const task = tasks.find((t) => t._id === taskId);

    if (!task || task.status === newStatus) return;
    if (!statusOrder.includes(newStatus)) return;

    onChangeStatus(taskId, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {statusOrder.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
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