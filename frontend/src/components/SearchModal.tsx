import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getPriorityColor } from '../utils/priority';
import { Status } from '../utils/status';
import TaskModalContent from './TaskModalContent';
import TaskModalRail from './TaskModalRail';
import ArticleModalContent from './ArticleModalContent';
import ArticleModalRail from './ArticleModalRail';
import { useTaskDetail } from '../hooks/useTaskDetail';
import { useArticleDetail } from '../hooks/useArticleDetail';

interface SearchTask {
  _id: string;
  title: string;
  description: string;
  priority: number;
  updatedAt: string;
}

interface SearchArticle {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const INITIAL_VISIBLE = 5;

type Mode = 'search' | 'detail';
type DetailType = 'task' | 'article';

const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef(0);

  // Search mode state
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [tasksVisible, setTasksVisible] = useState(INITIAL_VISIBLE);
  const [articlesVisible, setArticlesVisible] = useState(INITIAL_VISIBLE);

  // Detail mode state
  const [mode, setMode] = useState<Mode>('search');
  const [detailType, setDetailType] = useState<DetailType>('task');
  const [detailId, setDetailId] = useState<string | null>(null);

  // Statuses для TaskModalContent
  const [statuses, setStatuses] = useState<Status[]>([]);

  // Хуки деталей — только когда открыт detail
  const taskDetail = useTaskDetail(
    mode === 'detail' && detailType === 'task' ? detailId : null,
    () => refetchSearch()
  );
  const articleDetail = useArticleDetail(
    mode === 'detail' && detailType === 'article' ? detailId : null,
    () => refetchSearch()
  );

  // Фокус на input при открытии в режиме search
  useEffect(() => {
    if (open && mode === 'search') {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, mode]);

  // Восстановление скролла при возврате из detail
  useLayoutEffect(() => {
    if (mode === 'search' && bodyRef.current) {
      bodyRef.current.scrollTop = savedScrollRef.current;
    }
  }, [mode]);

  // Сброс при закрытии
  useEffect(() => {
    if (!open) {
      setQuery('');
      setTasks([]);
      setArticles([]);
      setTasksTotal(0);
      setArticlesTotal(0);
      setSearched(false);
      setTasksVisible(INITIAL_VISIBLE);
      setArticlesVisible(INITIAL_VISIBLE);
      setMode('search');
      setDetailId(null);
      savedScrollRef.current = 0;
    }
  }, [open]);

  // Загрузка статусов один раз
  useEffect(() => {
    if (open && statuses.length === 0) {
      api.get('/api/statuses')
        .then((res) => setStatuses(res.data.statuses))
        .catch((err) => console.error('Error fetching statuses:', err));
    }
  }, [open, statuses.length]);

  // Esc: в detail → в search, в search → закрыть
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'detail') {
          setMode('search');
          setDetailId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, mode, onClose]);

  // Debounce поиска
  // mode НЕ в зависимостях — чтобы при возврате из detail
  // запрос не перезапускался и не сбрасывал tasksVisible/articlesVisible
  useEffect(() => {
    if (!open || mode !== 'search') return;

    const trimmed = query.trim();
    if (!trimmed) {
      setTasks([]);
      setArticles([]);
      setTasksTotal(0);
      setArticlesTotal(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await api.get(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const { tasks, tasksTotal, articles, articlesTotal } = response.data.results;
        setTasks(tasks);
        setArticles(articles);
        setTasksTotal(tasksTotal);
        setArticlesTotal(articlesTotal);
        setTasksVisible(INITIAL_VISIBLE);
        setArticlesVisible(INITIAL_VISIBLE);
        setSearched(true);
      } catch (err) {
        console.error('Search error:', err);
        setTasks([]);
        setArticles([]);
        setTasksTotal(0);
        setArticlesTotal(0);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  const refetchSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const response = await api.get(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const { tasks, tasksTotal, articles, articlesTotal } = response.data.results;
      setTasks(tasks);
      setArticles(articles);
      setTasksTotal(tasksTotal);
      setArticlesTotal(articlesTotal);
    } catch (err) {
      console.error('Refetch search error:', err);
    }
  };

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (mode === 'detail') {
      setMode('search');
      setDetailId(null);
    } else {
      onClose();
    }
  };

  const openTaskDetail = (id: string) => {
    savedScrollRef.current = bodyRef.current?.scrollTop || 0;
    setDetailType('task');
    setDetailId(id);
    setMode('detail');
  };

  const openArticleDetail = (id: string) => {
    savedScrollRef.current = bodyRef.current?.scrollTop || 0;
    setDetailType('article');
    setDetailId(id);
    setMode('detail');
  };

  const closeDetail = () => {
    setMode('search');
    setDetailId(null);
  };

  const openTasksSection = () => {
    onClose();
    navigate(`/tasks?q=${encodeURIComponent(query.trim())}`);
  };

  const openArticlesSection = () => {
    onClose();
    navigate(`/knowledge?q=${encodeURIComponent(query.trim())}`);
  };

  const isEmpty = searched && tasksTotal === 0 && articlesTotal === 0;
  const hasResults = tasksTotal > 0 || articlesTotal > 0;

  // ============ DETAIL MODE ============
  if (mode === 'detail') {
    const isTask = detailType === 'task';
    const detailTitle = isTask
      ? (taskDetail.isEditing ? 'Редактирование задачи' : (taskDetail.task?.title || ''))
      : (articleDetail.isEditing ? 'Редактирование статьи' : (articleDetail.article?.title || ''));

    const detailReady = isTask
      ? (taskDetail.task && !taskDetail.loading && !taskDetail.error)
      : (articleDetail.article && !articleDetail.loading && !articleDetail.error);

    const rail = detailReady ? (
      isTask ? (
        <TaskModalRail
          linkCopied={taskDetail.linkCopied}
          isEditing={taskDetail.isEditing}
          onCopyLink={taskDetail.handleCopyLink}
          onEdit={taskDetail.startEdit}
          onDelete={async () => {
            await taskDetail.handleDelete();
            closeDetail();
          }}
        />
      ) : (
        <ArticleModalRail
          linkCopied={articleDetail.linkCopied}
          isEditing={articleDetail.isEditing}
          onCopyLink={articleDetail.handleCopyLink}
          onEdit={articleDetail.startEdit}
          onDelete={async () => {
            await articleDetail.handleDelete();
            closeDetail();
          }}
        />
      )
    ) : null;

    return (
      <div className="command-palette-backdrop" onMouseDown={handleBackdropClick}>
        <div className="command-palette command-palette--detail">
          <div className="command-palette-detail-header">
            <button
              type="button"
              className="command-palette-detail-back"
              onClick={closeDetail}
              aria-label="Назад к поиску"
              title="Назад к поиску"
            >
              ←
            </button>
            <h2 className="command-palette-detail-title">{detailTitle}</h2>
          </div>
          <div className="command-palette-detail-body-wrapper">
            <div className="command-palette-detail-body">
              {isTask ? (
                <TaskModalContent
                  task={taskDetail.task}
                  loading={taskDetail.loading}
                  error={taskDetail.error}
                  statuses={statuses}
                  isEditing={taskDetail.isEditing}
                  editTitle={taskDetail.editTitle}
                  editDescription={taskDetail.editDescription}
                  editStatusId={taskDetail.editStatusId}
                  editPriority={taskDetail.editPriority}
                  editDueDate={taskDetail.editDueDate}
                  saving={taskDetail.saving}
                  setEditTitle={taskDetail.setEditTitle}
                  setEditDescription={taskDetail.setEditDescription}
                  setEditStatusId={taskDetail.setEditStatusId}
                  setEditPriority={taskDetail.setEditPriority}
                  setEditDueDate={taskDetail.setEditDueDate}
                  onSave={taskDetail.saveEdit}
                  onCancel={taskDetail.cancelEdit}
                  onQuickChangeStatus={taskDetail.quickChangeStatus}
                />
              ) : (
                <ArticleModalContent
                  article={articleDetail.article}
                  loading={articleDetail.loading}
                  error={articleDetail.error}
                  isEditing={articleDetail.isEditing}
                  editTitle={articleDetail.editTitle}
                  editContent={articleDetail.editContent}
                  saving={articleDetail.saving}
                  setEditTitle={articleDetail.setEditTitle}
                  setEditContent={articleDetail.setEditContent}
                  onSave={articleDetail.saveEdit}
                  onCancel={articleDetail.cancelEdit}
                />
              )}
            </div>
            {rail && <div className="command-palette-detail-rail">{rail}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ============ SEARCH MODE ============
  return (
    <div className="command-palette-backdrop" onMouseDown={handleBackdropClick}>
      <div className="command-palette">
        <div className="command-palette-input-wrap">
          <span className="command-palette-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Поиск по задачам и статьям..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="command-palette-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="command-palette-body" ref={bodyRef}>
          {!query.trim() && (
            <div className="command-palette-hint">
              Начните вводить запрос...
            </div>
          )}

          {query.trim() && loading && (
            <div className="command-palette-hint">
              Поиск...
            </div>
          )}

          {query.trim() && !loading && isEmpty && (
            <div className="command-palette-empty">
              <p className="command-palette-empty-title">
                Ничего не найдено по запросу «{query.trim()}»
              </p>
            </div>
          )}

          {query.trim() && !loading && hasResults && (
            <>
              {tasksTotal > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-header">
                    <span className="command-palette-section-title">
                      Задачи ({tasksTotal})
                    </span>
                  </div>
                  <div className="command-palette-list">
                    {tasks.slice(0, tasksVisible).map((t) => (
                      <div
                        key={t._id}
                        className="command-palette-item"
                        onClick={() => openTaskDetail(t._id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openTaskDetail(t._id)}
                      >
                        <span
                          className="command-palette-item-rail"
                          style={{ backgroundColor: getPriorityColor(t.priority) }}
                        />
                        <div className="command-palette-item-content">
                          <div className="command-palette-item-title">{t.title}</div>
                          {t.description && (
                            <div className="command-palette-item-subtitle">{t.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="command-palette-section-footer">
                    {tasksVisible < tasksTotal && (
                      <button
                        type="button"
                        className="command-palette-more"
                        onClick={() => setTasksVisible((v) => v + INITIAL_VISIBLE)}
                      >
                        Показать ещё
                      </button>
                    )}
                    <button
                      type="button"
                      className="command-palette-open-section"
                      onClick={openTasksSection}
                    >
                      Открыть в разделе →
                    </button>
                  </div>
                </div>
              )}

              {articlesTotal > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-header">
                    <span className="command-palette-section-title">
                      Статьи ({articlesTotal})
                    </span>
                  </div>
                  <div className="command-palette-list">
                    {articles.slice(0, articlesVisible).map((a) => (
                      <div
                        key={a._id}
                        className="command-palette-item"
                        onClick={() => openArticleDetail(a._id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openArticleDetail(a._id)}
                      >
                        <span className="command-palette-item-rail command-palette-item-rail--article" />
                        <div className="command-palette-item-content">
                          <div className="command-palette-item-title">{a.title}</div>
                          {a.content && (
                            <div className="command-palette-item-subtitle">{a.content}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="command-palette-section-footer">
                    {articlesVisible < articlesTotal && (
                      <button
                        type="button"
                        className="command-palette-more"
                        onClick={() => setArticlesVisible((v) => v + INITIAL_VISIBLE)}
                      >
                        Показать ещё
                      </button>
                    )}
                    <button
                      type="button"
                      className="command-palette-open-section"
                      onClick={openArticlesSection}
                    >
                      Открыть в разделе →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;