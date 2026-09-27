import React, { useEffect, ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  rightRail?: ReactNode;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, wide, rightRail, children }) => {
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={wide ? 'modal-content modal-content--wide' : 'modal-content'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
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