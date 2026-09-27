import React from 'react';

interface ArticleModalRailProps {
  linkCopied: boolean;
  isEditing: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ArticleModalRail: React.FC<ArticleModalRailProps> = ({
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

export default ArticleModalRail;