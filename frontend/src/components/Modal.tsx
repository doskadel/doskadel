import React, { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  rightRail?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, wide, rightRail, onBack, children }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // true только если mousedown был именно на backdrop (не на дочернем элементе)
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Закрываем, только если mousedown тоже был на backdrop
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownOnBackdropRef.current = false;
  };

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className={wide ? 'modal-content modal-content--wide' : 'modal-content'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          {onBack && (
            <button type="button" className="modal-back" onClick={onBack} aria-label="Назад" title="Назад">
              ←
            </button>
          )}
          {title ? <h2 className="modal-title">{title}</h2> : <span style={{ flex: 1 }} />}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body-wrapper">
          <div className="modal-body">{children}</div>
          {rightRail && <div className="modal-rail-right">{rightRail}</div>}
        </div>
      </div>
    </div>
  );
};

export default Modal;