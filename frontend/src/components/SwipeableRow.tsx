import React, { useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 132; // ширина двух кнопок (66+66)

/**
 * Обёртка карточки в списке: свайп влево открывает кнопки «Редактировать»/«Удалить»,
 * свайп вправо (или тап по контенту) закрывает. Плавная анимация.
 */
interface SwipeableRowPropsWithState extends SwipeableRowProps {
  onOpenChange?: (open: boolean) => void;
}

const SwipeableRow: React.FC<SwipeableRowPropsWithState> = ({ children, onEdit, onDelete, onOpenChange }) => {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const horizontal = useRef<boolean | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    dragging.current = true;
    horizontal.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // определить ось один раз
    if (horizontal.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        horizontal.current = Math.abs(dx) > Math.abs(dy);
      }
    }
    if (horizontal.current === false) return; // вертикальный скролл — не мешаем

    const base = open ? -ACTION_WIDTH : 0;
    let next = base + dx;
    if (next > 0) next = 0;
    if (next < -ACTION_WIDTH) next = -ACTION_WIDTH;
    setOffset(next);
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (horizontal.current === false) return;
    // порог: если открыли больше половины — фиксируем открытие
    const shouldOpen = offset < -ACTION_WIDTH / 2;
    setOpen(shouldOpen);
    setOffset(shouldOpen ? -ACTION_WIDTH : 0);
    onOpenChange?.(shouldOpen);
  };

  const close = () => {
    setOpen(false);
    setOffset(0);
    onOpenChange?.(false);
  };

  return (
    <div className="swipe-row">
      <div className="swipe-row-actions">
        <button
          type="button"
          className="swipe-action swipe-action--edit"
          onClick={() => { close(); onEdit(); }}
          aria-label="Редактировать"
        >
          <Pencil size={20} />
          <span>Изменить</span>
        </button>
        <button
          type="button"
          className="swipe-action swipe-action--delete"
          onClick={() => { close(); onDelete(); }}
          aria-label="Удалить"
        >
          <Trash2 size={20} />
          <span>Удалить</span>
        </button>
      </div>
      <div
        className="swipe-row-content"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current && horizontal.current ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;
