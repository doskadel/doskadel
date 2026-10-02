import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import PullToRefresh from './PullToRefresh';
import LoadingOverlay from './LoadingOverlay';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getPriorityColor } from '../utils/priority';
import { formatDueDate } from '../utils/date';

interface StatusCount {
  statusId: string;
  name: string;
  color: string;
  count: number;
}

interface RecentTask {
  _id: string;
  title: string;
  statusId: string;
  priority: number;
  updatedAt: string;
}

interface DueTask {
  _id: string;
  title: string;
  statusId: string;
  priority: number;
  dueDate: string;
  occurrenceCount?: number;
  isRecurring?: boolean;
}

interface RecentArticle {
  _id: string;
  title: string;
  createdAt: string;
}

interface DashboardData {
  statusCounts: StatusCount[];
  totalTasks: number;
  totalArticles: number;
  recentTasks: RecentTask[];
  recentArticles: RecentArticle[];
  overdueTasks: DueTask[];
  overdueCount: number;
  overdueDistinctTasks?: number;
  upcomingTasks: DueTask[];
  upcomingCount: number;
  upcomingDistinctTasks?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data.dashboard);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить данные');
      setLoading(false);
    }
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHour < 24) return `${diffHour} ч назад`;
    if (diffDay < 7) return `${diffDay} дн назад`;
    return d.toLocaleDateString('ru-RU');
  };

  const handleRefresh = async () => {
    await fetchDashboard();
  };

  if (loading) return <LoadingOverlay active text="Загрузка..." />;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!data) return null;

  const isEmpty = data.totalTasks === 0 && data.totalArticles === 0;

  // Сколько ещё вхождений, кроме той, что показываем
  const extraOccurrences = (t: DueTask): number => {
    if (!t.occurrenceCount || t.occurrenceCount <= 1) return 0;
    return t.occurrenceCount - 1;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Главная</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button"
            onClick={() => navigate('/tasks?new=1')}
          >
            + Добавить задачу
          </button>
          <button
            type="button"
            className="button button--outline"
            onClick={() => navigate('/knowledge?new=1')}
          >
            + Добавить статью
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="dashboard-empty">
          <p className="dashboard-empty-title">Добро пожаловать в DoskaDel</p>
          <p className="dashboard-empty-text">
            Начните с создания первой задачи или статьи — используйте кнопки выше.
          </p>
        </div>
      ) : (
        <>
          {/* --- ПРОСРОЧЕНО --- */}
          {data.overdueTasks.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title dashboard-section-title--danger">
                  <AlertTriangle size={18} /> Просрочено ({data.overdueDistinctTasks ?? data.overdueTasks.length})
                </h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/tasks?overdue=1')}
                >
                  Все →
                </button>
              </div>
              <div className="dashboard-list">
                {data.overdueTasks.map((t) => {
                  const extra = extraOccurrences(t);
                  return (
                    <div
                      key={t._id}
                      className="dashboard-item"
                      onClick={() => navigate(`/tasks?task=${t._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks?task=${t._id}`)}
                    >
                      <span
                        className="dashboard-item-priority"
                        style={{ backgroundColor: getPriorityColor(t.priority) }}
                      />
                      <span className="dashboard-item-title">{t.title}</span>
                      <span className="dashboard-item-date dashboard-item-date--danger">
                        Срок до {formatDueDate(t.dueDate)}
                        {extra > 0 && (
                          <span className="dashboard-item-extra"> · + ещё {extra}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- БЛИЖАЙШИЕ СРОКИ --- */}
          {data.upcomingTasks.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">
                  <Calendar size={18} /> Ближайшие сроки ({data.upcomingDistinctTasks ?? data.upcomingTasks.length})
                </h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/tasks?dueSoon=1')}
                >
                  Все →
                </button>
              </div>
              <div className="dashboard-list">
                {data.upcomingTasks.map((t) => {
                  const extra = extraOccurrences(t);
                  return (
                    <div
                      key={t._id}
                      className="dashboard-item"
                      onClick={() => navigate(`/tasks?task=${t._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks?task=${t._id}`)}
                    >
                      <span
                        className="dashboard-item-priority"
                        style={{ backgroundColor: getPriorityColor(t.priority) }}
                      />
                      <span className="dashboard-item-title">{t.title}</span>
                      <span className="dashboard-item-date">
                        Срок до {formatDueDate(t.dueDate)}
                        {extra > 0 && (
                          <span className="dashboard-item-extra"> · + ещё {extra}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- ЗАДАЧИ ПО СТАТУСАМ --- */}
          {data.statusCounts.length > 0 && (
            <div className="dashboard-section">
              <h3 className="dashboard-section-title">Задачи по статусам</h3>
              <div className="dashboard-status-grid">
                {data.statusCounts.map((s) => (
                  <div
                    key={s.statusId}
                    className="dashboard-status-card"
                    onClick={() => navigate(`/tasks?statuses=${s.statusId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks?statuses=${s.statusId}`)}
                  >
                    <div
                      className="dashboard-status-rail"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="dashboard-status-content">
                      <div className="dashboard-status-name">{s.name}</div>
                      <div className="dashboard-status-count">{s.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- ПОСЛЕДНИЕ ЗАДАЧИ --- */}
          {data.recentTasks.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">Последние задачи</h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/tasks')}
                >
                  Все →
                </button>
              </div>
              <div className="dashboard-list">
                {data.recentTasks.map((t) => (
                  <div
                    key={t._id}
                    className="dashboard-item"
                    onClick={() => navigate(`/tasks?task=${t._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks?task=${t._id}`)}
                  >
                    <span
                      className="dashboard-item-priority"
                      style={{ backgroundColor: getPriorityColor(t.priority) }}
                    />
                    <span className="dashboard-item-title">{t.title}</span>
                    <span className="dashboard-item-date">{formatDate(t.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- ПОСЛЕДНИЕ СТАТЬИ --- */}
          {data.recentArticles.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">Последние статьи</h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/knowledge')}
                >
                  Все →
                </button>
              </div>
              <div className="dashboard-list">
                {data.recentArticles.map((a) => (
                  <div
                    key={a._id}
                    className="dashboard-item"
                    onClick={() => navigate(`/knowledge?article=${a._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/knowledge?article=${a._id}`)}
                  >
                    <span className="dashboard-item-title">{a.title}</span>
                    <span className="dashboard-item-date">{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
};

export default Dashboard;