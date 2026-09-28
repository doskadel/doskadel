import React from 'react';

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
        {linkCopied ? '✓' : '🔗'}
      </button>
      <button
        type="button"
        className="modal-rail-btn"
        onClick={onEdit}
        title="Редактировать"
        aria-label="Редактировать"
        disabled={isEditing}
      >
        ✏️
      </button>
      <button
        type="button"
        className="modal-rail-btn modal-rail-btn--danger"
        onClick={onDelete}
        title="Удалить"
        aria-label="Удалить"
      >
        🗑️
      </button>
    </>
  );
};

export default TaskModalRail;