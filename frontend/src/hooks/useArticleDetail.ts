import { useState, useEffect } from 'react';
import api from '../utils/api';

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
  saveEdit: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
}

export const useArticleDetail = (
  articleId: string | null,
  onUpdate?: () => void
): UseArticleDetailResult => {
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
    } catch (err) {
      console.error('Error updating article:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!window.confirm('Удалить статью?')) return;
    try {
      await api.delete(`/api/articles/${article._id}`);
      onUpdate?.();
    } catch (err) {
      console.error('Error deleting article:', err);
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
    saveEdit,
    handleDelete,
    handleCopyLink,
  };
};