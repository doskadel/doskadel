import { useState, useEffect } from 'react';
import api from '../utils/api';

export interface Task {
  _id: string;
  title: string;
  description: string;
  statusId: string;
  priority: number;
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
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditDescription: (v: string) => void;
  setEditStatusId: (v: string) => void;
  setEditPriority: (v: number) => void;

  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  quickChangeStatus: (statusId: string) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
}

export const useTaskDetail = (
  taskId: string | null,
  onUpdate?: () => void
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
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/tasks/${task._id}`, {
        title: editTitle,
        description: editDescription,
        statusId: editStatusId,
        priority: editPriority,
      });
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

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/api/tasks/${task._id}`);
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting task:', err);
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
    saving,
    setEditTitle,
    setEditDescription,
    setEditStatusId,
    setEditPriority,
    startEdit,
    cancelEdit,
    saveEdit,
    quickChangeStatus,
    handleDelete,
    handleCopyLink,
  };
};