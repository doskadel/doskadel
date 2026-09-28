import React, { useState } from 'react';
import Modal from './Modal';
import TaskModalContent from './TaskModalContent';
import TaskModalRail from './TaskModalRail';
import OccurrenceConfirmModal from './OccurrenceConfirmModal';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { useOccurrences } from '../hooks/useOccurrences';
import { useConfirm } from './ConfirmProvider';
import { Status } from '../utils/status';

interface TaskModalProps {
  taskId: string | null;
  statuses: Status[];
  onClose: () => void;
  onUpdate: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ taskId, statuses, onClose, onUpdate }) => {
  const confirm = useConfirm();
  const detail = useTaskDetail(taskId, onUpdate, confirm);
  const occurrences = useOccurrences(taskId);
  const [occurrencesOpen, setOccurrencesOpen] = useState(false);

  const handleClose = () => {
    detail.cancelEdit();
    onClose();
  };

  const handleDelete = async () => {
    const deleted = await detail.handleDelete();
    if (deleted) onClose();
  };

  const isRecurring = !!detail.task?.recurrence;
  const pendingCount = occurrences.pendingDue.length; // только наступившие

  const modalTitle = detail.isEditing
    ? 'Редактирование задачи'
    : (detail.task?.title || '');

  const rail = detail.task && !detail.loading && !detail.error ? (
    <TaskModalRail
      linkCopied={detail.linkCopied}
      isEditing={detail.isEditing}
      isRecurring={isRecurring}
      pendingCount={pendingCount}
      onCopyLink={detail.handleCopyLink}
      onEdit={detail.startEdit}
      onDelete={handleDelete}
      onOpenOccurrences={() => setOccurrencesOpen(true)}
    />
  ) : null;

  return (
    <>
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
          editDueDate={detail.editDueDate}
          editRecurrence={detail.editRecurrence}
          saving={detail.saving}
          setEditTitle={detail.setEditTitle}
          setEditDescription={detail.setEditDescription}
          setEditStatusId={detail.setEditStatusId}
          setEditPriority={detail.setEditPriority}
          setEditDueDate={detail.setEditDueDate}
          setEditRecurrence={detail.setEditRecurrence}
          onSave={detail.saveEdit}
          onCancel={detail.cancelEdit}
          onQuickChangeStatus={detail.quickChangeStatus}
          pendingCount={pendingCount}
        />
      </Modal>

      {detail.task && isRecurring && (
        <OccurrenceConfirmModal
          open={occurrencesOpen}
          onClose={() => setOccurrencesOpen(false)}
          taskTitle={detail.task.title}
          pending={occurrences.pendingDue}
          done={occurrences.done}
          loading={occurrences.loading}
          onConfirm={async (ids) => {
            await occurrences.confirmIds(ids);
            onUpdate?.();
          }}
          onUnconfirm={async (ids) => {
            await occurrences.unconfirmIds(ids);
            onUpdate?.();
          }}
        />
      )}
    </>
  );
};

export default TaskModal;