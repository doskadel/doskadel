import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

export interface Article {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseArticleDetailResult {
  article: Article | null;
  loading: boolean;
  error: string;
  linkCopied: boolean;

  isEditing: boolean;
  editTitle: string;
  editContent: string;
  saving: boolean;

  setEditTitle: (v: string) => void;
  setEditContent: (v: string) => void;

  startEdit: () => void;
  cancelEdit: () => void;
  isDirty: boolean;
  requestCancelEdit: () => Promise<boolean>;
  saveEdit: () => Promise<void>;
  handleDelete: () => Promise<boolean>;
  handleCopyLink: () => Promise<void>;
}

export const useArticleDetail = (
  articleId: string | null,
  onUpdate?: () => void,
  onConfirm?: (options: {
    title: string;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>
): UseArticleDetailResult => {
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setIsEditing(false);
      setLinkCopied(false);
      return;
    }
    fetchArticle(articleId);
  }, [articleId]);

  const fetchArticle = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/articles/${id}`);
      const a = response.data.article;
      setArticle(a);
      setEditTitle(a.title);
      setEditContent(a.content);
    } catch (err: any) {
      console.error('Error fetching article:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить статью');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!article) return;
    setEditTitle(article.title);
    setEditContent(article.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Несохранённые правки: снимок полей на момент входа в редактирование
  const editSig = JSON.stringify([editTitle, editContent]);
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
    if (!article) return;
    setSaving(true);
    try {
      const response = await api.put(`/api/articles/${article._id}`, {
        title: editTitle,
        content: editContent,
      });
      setArticle(response.data.article);
      setIsEditing(false);
      onUpdate?.();
      toast('Статья сохранена', 'success');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Не удалось сохранить статью', 'error');
      console.error('Error updating article:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!article) return false;
    if (onConfirm) {
      const ok = await onConfirm({
        title: 'Удалить статью?',
        message: 'Это действие нельзя отменить.',
        confirmLabel: 'Удалить',
        danger: true,
      });
      if (!ok) return false;
    }
    try {
      await api.delete(`/api/articles/${article._id}`);
      onUpdate?.();
      toast('Статья удалена', 'success');
      return true;
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Не удалось удалить статью', 'error');
      console.error('Error deleting article:', err);
      return false;
    }
  };

  const handleCopyLink = async () => {
    if (!article) return;
    const url = `${window.location.origin}/knowledge?article=${article._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return {
    article,
    loading,
    error,
    linkCopied,
    isEditing,
    editTitle,
    editContent,
    saving,
    setEditTitle,
    setEditContent,
    startEdit,
    cancelEdit,
    isDirty,
    requestCancelEdit,
    saveEdit,
    handleDelete,
    handleCopyLink,
  };
};