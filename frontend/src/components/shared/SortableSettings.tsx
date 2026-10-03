import React, { ReactNode } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface SortableRowItem {
  id: string;
  label: string;
  enabled: boolean;
  extra?: ReactNode;
}

interface RowProps {
  item: SortableRowItem;
  onToggle: () => void;
  toggleAria?: string;
}

const Row: React.FC<RowProps> = ({ item, onToggle, toggleAria }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={'ve-row' + (isDragging ? ' ve-row--dragging' : '')}>
      <button type="button" className="ve-handle" {...attributes} {...listeners} aria-label="Перетащить">
        <GripVertical size={18} />
      </button>
      <span className="ve-label">{item.label}</span>
      {item.extra}
      <button
        type="button"
        className={'ve-toggle' + (item.enabled ? ' ve-toggle--on' : '')}
        onClick={onToggle}
        role="switch"
        aria-checked={item.enabled}
        aria-label={toggleAria || (item.enabled ? 'Скрыть' : 'Показать')}
      >
        <span className="ve-toggle-knob" />
      </button>
    </div>
  );
};

interface SortableSettingsProps {
  items: SortableRowItem[];
  onToggle: (id: string) => void;
  onReorder: (ids: string[]) => void;
  toggleAria?: string;
}

const SortableSettings: React.FC<SortableSettingsProps> = ({ items, onToggle, onReorder, toggleAria }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map((i) => i.id);
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, String(active.id));
    onReorder(next);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="ve-list">
          {items.map((it) => (
            <Row key={it.id} item={it} onToggle={() => onToggle(it.id)} toggleAria={toggleAria} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableSettings;
