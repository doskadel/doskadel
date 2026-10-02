import React from 'react';
import { Link, Check, Pencil, Trash2 } from 'lucide-react';

interface TaskModalRailProps {
  linkCopied: boolean;
  isEditing: boolean;
  isRecurring: boolean;
  pendingCount: number;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenOccurrences: () => void;
}

const TaskModalRail: React.FC<TaskModalRailProps> = ({
  linkCopied,
  isEditing,
  isRecurring,
  pendingCount,
  onCopyLink,
  onEdit,
  onDelete,
  onOpenOccurrences,
}) => {
  return (
    <>
      {isRecurring && (
        <button
          type="button"
          className="modal-rail-btn modal-rail-btn--badge"
          onClick={onOpenOccurrences}
          title={
            pendingCount > 0
              ? `Подтверждения: ${pendingCount}`
              : 'Подтверждения'
          }
          aria-label="Подтверждения"
        >
          ⏱
          {pendingCount > 0 && (
            <span className="modal-rail-badge">{pendingCount}</span>
          )}
        </button>
      )}

      <button
        type="button"
        className="modal-rail-btn"
        onClick={onCopyLink}
        title={linkCopied ? 'Скопировано!' : 'Копировать ссылку'}
        aria-label="Копировать ссылку"
      >
        {linkCopied ? <Check size={18} /> : <Link size={18} />}
      </button>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={onEdit}
        title="Редактировать"
        aria-label="Редактировать"
        disabled={isEditing}
      >
        <Pencil size={18} />
      </button>
      <button
        type="button"
        className="modal-rail-btn modal-rail-btn--danger"
        onClick={onDelete}
        title="Удалить"
        aria-label="Удалить"
      >
        <Trash2 size={18} />
      </button>
    </>
  );
};

export default TaskModalRail;