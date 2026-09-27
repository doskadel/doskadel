import React from 'react';
import Modal from './Modal';
import ArticleModalContent from './ArticleModalContent';
import ArticleModalRail from './ArticleModalRail';
import { useArticleDetail } from '../hooks/useArticleDetail';

interface ArticleModalProps {
  articleId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ articleId, onClose, onUpdate }) => {
  const detail = useArticleDetail(articleId, onUpdate);

  const handleClose = () => {
    detail.cancelEdit();
    onClose();
  };

  const handleDelete = async () => {
    await detail.handleDelete();
    onClose();
  };

  const modalTitle = detail.isEditing
    ? 'Редактирование статьи'
    : (detail.article?.title || '');

  const rail = detail.article && !detail.loading && !detail.error ? (
    <ArticleModalRail
      linkCopied={detail.linkCopied}
      isEditing={detail.isEditing}
      onCopyLink={detail.handleCopyLink}
      onEdit={detail.startEdit}
      onDelete={handleDelete}
    />
  ) : null;

  return (
    <Modal open={!!articleId} onClose={handleClose} title={modalTitle} wide rightRail={rail}>
      <ArticleModalContent
        article={detail.article}
        loading={detail.loading}
        error={detail.error}
        isEditing={detail.isEditing}
        editTitle={detail.editTitle}
        editContent={detail.editContent}
        saving={detail.saving}
        setEditTitle={detail.setEditTitle}
        setEditContent={detail.setEditContent}
        onSave={detail.saveEdit}
        onCancel={detail.cancelEdit}
      />
    </Modal>
  );
};

export default ArticleModal;