import React from 'react';

interface TaskModalRailProps {
  linkCopied: boolean;
  isEditing: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskModalRail: React.FC<TaskModalRailProps> = ({
  linkCopied,
  isEditing,
  onCopyLink,
  onEdit,
  onDelete,
}) => {
  return (
    <>
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