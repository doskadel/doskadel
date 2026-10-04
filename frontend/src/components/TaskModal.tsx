import React, { useState } from 'react';
import Modal from './Modal';
import TaskModalContent from './TaskModalContent';
import TaskModalRail from './TaskModalRail';
import OccurrenceHistoryModal from './OccurrenceHistoryModal';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { useOccurrences } from '../hooks/useOccurrences';
import { useConfirm } from './ConfirmProvider';
import { Status } from '../utils/status';
import api from '../utils/api';

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

  const handleClose = async () => {
    if (detail.isEditing && !(await detail.requestCancelEdit())) return;
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
      isFinal={!!statuses.find((s) => s._id === detail.task?.statusId)?.isFinal}
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
          onCancel={detail.requestCancelEdit}
          onQuickChangeStatus={detail.quickChangeStatus}
          onQuickAction={async (action, originalDate) => {
            if (!detail.task) return;
            await api.post('/api/occurrences/action', { taskId: detail.task._id, originalDate, action });
            onUpdate?.();
          }}
          pendingCount={pendingCount}
        />
      </Modal>

      {detail.task && isRecurring && (
        <OccurrenceHistoryModal
          open={occurrencesOpen}
          onClose={() => setOccurrencesOpen(false)}
          taskId={detail.task._id}
          taskTitle={detail.task.title}
          pending={occurrences.pending}
          done={occurrences.done}
          loading={occurrences.loading}
          onAct={async (originalDate, action) => {
            await occurrences.act({ taskId: detail.task!._id, originalDate, action });
            onUpdate?.();
          }}
        />
      )}
    </>
  );
};

export default TaskModal;