import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen } from 'lucide-react';
import PullToRefresh from './PullToRefresh';
import LoadingOverlay from './LoadingOverlay';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Modal from './Modal';
import ArticleModal from './ArticleModal';
import ArticleFilterBar from './ArticleFilterBar';
import { useConfirm } from './ConfirmProvider';
import { useToast } from './Toast';

interface Article {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const DEFAULT_SORT = 'createdAt_desc';

const Knowledge: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirm();
  const { toast } = useToast();

  const openedArticleId = searchParams.get('article');
  const q = searchParams.get('q') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const sortParam = searchParams.get('sort') || '';
  const newParam = searchParams.get('new');

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) {
        updateQuery({ q: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchArticles();
  }, [q, dateFrom, dateTo, sortParam]);

  useEffect(() => {
    if (newParam === '1') {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [newParam]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (sortParam) params.set('sort', sortParam);

      const url = '/api/articles' + (params.toString() ? '?' + params.toString() : '');
      const response = await api.get(url);
      setArticles(response.data.articles);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setLoading(false);
    }
  };

  const openArticle = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('article', id);
    setSearchParams(next);
  };

  const closeArticleModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('article');
    setSearchParams(next);
  };

  const resetCreateForm = () => {
    setTitle('');
    setContent('');
  };

  const isCreateFormDirty = (): boolean => {
    return title.trim() !== '' || content.trim() !== '';
  };

  const handleCloseCreate = async () => {
    if (isCreateFormDirty()) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения будут потеряны. Закрыть форму?',
        confirmLabel: 'Закрыть',
        danger: true,
      });
      if (!ok) return;
    }
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/articles', { title, content });
      resetCreateForm();
      setCreateOpen(false);
      fetchArticles();
      toast('Статья создана', 'success');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Не удалось создать статью', 'error');
      console.error('Error creating article:', err);
    }
  };

  const handleResetFilters = () => {
    updateQuery({ q: null, dateFrom: null, dateTo: null, sort: null });
    setSearchInput('');
  };

  const handleDateFromChange = (value: string) => {
    if (value && dateTo && value > dateTo) return;
    updateQuery({ dateFrom: value || null });
  };

  const handleDateToChange = (value: string) => {
    if (value && dateFrom && value < dateFrom) return;
    updateQuery({ dateTo: value || null });
  };

  const handleDatesClear = () => {
    updateQuery({ dateFrom: null, dateTo: null });
  };

  const dateError = (() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return 'Дата «По» не может быть раньше даты «С»';
    }
    return '';
  })();

  const hasActiveFilters = !!(q || dateFrom || dateTo || (sortParam && sortParam !== DEFAULT_SORT));

  const handleRefresh = async () => {
    await fetchArticles();
  };

  if (loading) return <LoadingOverlay active text="Загрузка..." />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      <h2 className="page-title" style={{ margin: 0, marginBottom: 'var(--space-md)' }}>База знаний</h2>
      <div className="tasks-actions-row">
        <button
          type="button"
          className="button button--white button--sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} /> Создать
        </button>
      </div>

      <ArticleFilterBar
        q={searchInput}
        onQChange={setSearchInput}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onDatesClear={handleDatesClear}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        dateError={dateError}
        sort={sortParam || DEFAULT_SORT}
        onSortChange={(s) => updateQuery({ sort: s === DEFAULT_SORT ? null : s })}
        defaultSort={DEFAULT_SORT}
      />

      <Modal open={createOpen} onClose={handleCloseCreate} title="Новая статья">
        <form onSubmit={handleSubmit} className="form">
          <label className="input-label input-label--required">Заголовок</label>
          <input
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            required
            autoFocus
          />
          <label className="input-label input-label--required">Содержимое</label>
          <textarea
            placeholder="Содержимое"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input"
            rows={8}
            required
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              className="button"
              onClick={handleCloseCreate}
              style={{ backgroundColor: 'var(--color-text-muted)' }}
            >
              Отмена
            </button>
            <button type="submit" className="button">Создать</button>
          </div>
        </form>
      </Modal>

      <ArticleModal
        articleId={openedArticleId}
        onClose={closeArticleModal}
        onUpdate={fetchArticles}
      />

      {articles.length === 0 && hasActiveFilters && (
        <div className="empty-state">
          <Search size={40} className="empty-state-icon" />
          <p className="empty-state-title">Ничего не найдено</p>
          <p className="empty-state-text">Попробуйте изменить фильтры или запрос</p>
        </div>
      )}

      {articles.length === 0 && !hasActiveFilters && (
        <div className="empty-state">
          <BookOpen size={44} className="empty-state-icon" />
          <p className="empty-state-title">Статей пока нет</p>
          <p className="empty-state-text">Нажмите «Создать», чтобы добавить первую статью</p>
        </div>
      )}

      {articles.length > 0 && (
        <div className="article-grid">
          {articles.map((article) => (
            <div
              key={article._id}
              className="article-card"
              onClick={() => openArticle(article._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(article._id); }
              }}
            >
              <h3 className="article-card-title">{article.title}</h3>
              <p className="article-card-description">{article.content}</p>
              <div className="article-card-meta">
                Создано: {new Date(article.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
};

export default Knowledge;