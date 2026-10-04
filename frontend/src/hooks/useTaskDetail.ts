import { useState, useEffect } from 'react';
import api from '../utils/api';
import { toDateTimeLocalValue } from '../utils/date';
import { Recurrence } from '../utils/recurrence';

export interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
  dueDate?: string | null;
  recurrence?: Recurrence | null;
  notifications?: { enabled: boolean };
  pendingOccurrenceCount?: number;
  nextOccurrenceDueAt?: string | null;
  occurrenceStatus?: 'pending' | 'overdue';
  closedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseTaskDetailResult {
  task: Task | null;
  loading: boolean;
  error: string;
  linkCopied: boolean;

  isEditing: boolean;
  editTitle: string;
  editDescription: string;
  editStatusId: string;
  editPriority: number;
  editDueDate: string;
  editRecurrence: Recurrence | null;
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditDescription: (v: string) => void;
  setEditStatusId: (v: string) => void;
  setEditPriority: (v: number) => void;
  setEditDueDate: (v: string) => void;
  setEditRecurrence: (v: Recurrence | null) => void;

  startEdit: () => void;
  cancelEdit: () => void;
  isDirty: boolean;
  requestCancelEdit: () => Promise<boolean>;
  saveEdit: () => Promise<void>;
  quickChangeStatus: (statusId: string) => Promise<void>;
  handleDelete: () => Promise<boolean>;
  handleCopyLink: () => Promise<void>;
  refresh: () => void;
}

export const useTaskDetail = (
  taskId: string | null,
  onUpdate?: () => void,
  onConfirm?: (options: {
    title: string;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>
): UseTaskDetailResult => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatusId, setEditStatusId] = useState('');
  const [editPriority, setEditPriority] = useState(2);
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setIsEditing(false);
      setLinkCopied(false);
      return;
    }
    fetchTask(taskId);
  }, [taskId]);

  const fetchTask = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/tasks/${id}`);
      const t = response.data.task;
      setTask(t);
      setEditTitle(t.title);
      setEditDescription(t.description || '');
      setEditStatusId(t.statusId);
      setEditPriority(t.priority);
      setEditDueDate(toDateTimeLocalValue(t.dueDate));
      // recurrence.time уже в UTC — оставляем как есть.
      // RecurrencePicker сам конвертирует UTC → локальное для показа.
      setEditRecurrence(t.recurrence || null);
    } catch (err: any) {
      console.error('Error fetching task:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить задачу');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatusId(task.statusId);
    setEditPriority(task.priority);
    setEditDueDate(toDateTimeLocalValue(task.dueDate));
    setEditRecurrence(task.recurrence || null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Несохранённые правки: снимок полей на момент входа в редактирование
  const editSig = JSON.stringify([editTitle, editDescription, editStatusId, editPriority, editDueDate, editRecurrence]);
  const [editSnap, setEditSnap] = useState('');
  useEffect(() => {
    setEditSnap(isEditing ? editSig : '');
  }, [isEditing]);
  const isDirty = isEditing && editSnap !== '' && editSig !== editSnap;

  const requestCancelEdit = async (): Promise<boolean> => {
    if (isDirty && onConfirm) {
      const ok = await onConfirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения не будут сохранены. Выйти без сохранения?',
        confirmLabel: 'Выйти без сохранения',
        danger: true,
      });
      if (!ok) return false;
    }
    cancelEdit();
    return true;
  };

  const saveEdit = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const payload: any = {
        title: editTitle,
        description: editDescription,
        statusId: editStatusId,
        priority: editPriority,
      };

      if (editRecurrence) {
        // editRecurrence.time уже в UTC (RecurrencePicker конвертирует)
        payload.recurrence = editRecurrence;
        payload.dueDate = null;
      } else {
        payload.recurrence = null;
        payload.dueDate = editDueDate ? new Date(editDueDate).toISOString() : null;
      }

      const response = await api.put(`/api/tasks/${task._id}`, payload);
      setTask(response.data.task);
      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const quickChangeStatus = async (newStatusId: string) => {
    if (!task) return;
    try {
      const response = await api.put(`/api/tasks/${task._id}`, { statusId: newStatusId });
      setTask(response.data.task);
      onUpdate?.();
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!task) return false;
    if (onConfirm) {
      const ok = await onConfirm({
        title: 'Удалить задачу?',
        message: 'Это действие нельзя отменить.',
        confirmLabel: 'Удалить',
        danger: true,
      });
      if (!ok) return false;
    }
    try {
      await api.delete(`/api/tasks/${task._id}`);
      onUpdate?.();
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  };

  const handleCopyLink = async () => {
    if (!task) return;
    const url = `${window.location.origin}/tasks?task=${task._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return {
    task,
    loading,
    error,
    linkCopied,
    isEditing,
    editTitle,
    editDescription,
    editStatusId,
    editPriority,
    editDueDate,
    editRecurrence,
    saving,
    setEditTitle,
    setEditDescription,
    setEditStatusId,
    setEditPriority,
    setEditDueDate,
    setEditRecurrence,
    startEdit,
    cancelEdit,
    isDirty,
    requestCancelEdit,
    saveEdit,
    quickChangeStatus,
    handleDelete,
    handleCopyLink,
    refresh: () => { if (taskId) fetchTask(taskId); },
  };
};