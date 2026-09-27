import React from 'react';
import Modal from './Modal';
import TaskModalContent from './TaskModalContent';
import TaskModalRail from './TaskModalRail';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { Status } from '../utils/status';

interface TaskModalProps {
  taskId: string | null;
  statuses: Status[];
  onClose: () => void;
  onUpdate: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ taskId, statuses, onClose, onUpdate }) => {
  const detail = useTaskDetail(taskId, onUpdate);

  const handleClose = () => {
    detail.cancelEdit();
    onClose();
  };

  const handleDelete = async () => {
    await detail.handleDelete();
    onClose();
  };

  const modalTitle = detail.isEditing
    ? 'Редактирование задачи'
    : (detail.task?.title || '');

  const rail = detail.task && !detail.loading && !detail.error ? (
    <TaskModalRail
      linkCopied={detail.linkCopied}
      isEditing={detail.isEditing}
      onCopyLink={detail.handleCopyLink}
      onEdit={detail.startEdit}
      onDelete={handleDelete}
    />
  ) : null;

  return (
    <Modal open={!!taskId} onClose={handleClose} title={modalTitle} wide rightRail={rail}>
      <TaskModalContent
        task={detail.task}
        loading={detail.loading}
        error={detail.error}
        statuses={statuses}
        isEditing={detail.isEditing}
        editTitle={detail.editTitle}
        editDescription={detail.editDescription}
        editStatusId={detail.editStatusId}
        editPriority={detail.editPriority}
        saving={detail.saving}
        setEditTitle={detail.setEditTitle}
        setEditDescription={detail.setEditDescription}
        setEditStatusId={detail.setEditStatusId}
        setEditPriority={detail.setEditPriority}
        onSave={detail.saveEdit}
        onCancel={detail.cancelEdit}
        onQuickChangeStatus={detail.quickChangeStatus}
      />
    </Modal>
  );
};

export default TaskModal;