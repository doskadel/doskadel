import React, { ReactNode } from 'react';
import Modal from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
  hideCancel?: boolean;
  extraActions?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  icon,
  hideCancel = false,
  extraActions,
  onConfirm,
  onClose,
  loading = false,
}) => {
  const handleConfirm = () => {
    if (loading) return;
    onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    onClose();
  };

  const titleNode = (
    <span className="confirm-dialog-title-wrap">
      {(icon || danger) && (
        <span className={'confirm-dialog-icon' + (danger ? ' confirm-dialog-icon--danger' : '')}>
          {icon ?? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </span>
      )}
      <span>{title}</span>
    </span>
  );

  return (
    <Modal open={open} onClose={handleCancel} title={titleNode as unknown as string}>
      <div className="confirm-dialog-body">
        {message && (
          <div className="confirm-dialog-message">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        )}

        <div className="confirm-dialog-actions">
          {extraActions && (
            <div className="confirm-dialog-extra">{extraActions}</div>
          )}
          <div className="confirm-dialog-buttons">
            {!hideCancel && (
              <button
                type="button"
                className="button"
                onClick={handleCancel}
                disabled={loading}
                style={{ backgroundColor: 'var(--color-text-muted)' }}
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              className={'button' + (danger ? ' button--danger' : '')}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? '...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;