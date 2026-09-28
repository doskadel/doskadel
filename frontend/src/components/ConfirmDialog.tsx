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
      {icon && <span className="confirm-dialog-icon">{icon}</span>}
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
              className="button"
              onClick={handleConfirm}
              disabled={loading}
              style={danger ? { backgroundColor: 'var(--color-danger)' } : undefined}
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