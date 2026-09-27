import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getPriorityColor } from '../utils/priority';

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
}

const pluralize = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

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

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!data) return null;

  const isEmpty = data.totalTasks === 0 && data.totalArticles === 0;

  const tasksLabel = pluralize(data.totalTasks, 'задача', 'задачи', 'задач');
  const articlesLabel = pluralize(
    data.totalArticles,
    'статья',
    'статьи',
    'статей'
  );

  return (
    <div className="dashboard">
      <h2 className="page-title">Главная</h2>

      {isEmpty ? (
        <div className="dashboard-empty">
          <p className="dashboard-empty-title">Добро пожаловать в WorkList</p>
          <p className="dashboard-empty-text">
            Начните с создания первой задачи или статьи в базе знаний.
          </p>
          <div className="dashboard-empty-actions">
            <button
              type="button"
              className="button"
              onClick={() => navigate('/tasks')}
            >
              + Добавить задачу
            </button>
            <button
              type="button"
              className="button"
              style={{ backgroundColor: 'var(--color-text-muted)' }}
              onClick={() => navigate('/knowledge')}
            >
              + Добавить статью
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* --- Верхние карточки-счётчики --- */}
          <div className="dashboard-counters">
            <div
              className="dashboard-counter"
              onClick={() => navigate('/tasks')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
            >
              <div className="dashboard-counter-value">{data.totalTasks}</div>
              <div className="dashboard-counter-label">{tasksLabel}</div>
            </div>

            <div
              className="dashboard-counter"
              onClick={() => navigate('/knowledge')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/knowledge')}
            >
              <div className="dashboard-counter-value">{data.totalArticles}</div>
              <div className="dashboard-counter-label">{articlesLabel}</div>
            </div>
          </div>

          {/* --- Плашки по статусам --- */}
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

          {/* --- Последние задачи --- */}
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

          {/* --- Последние статьи --- */}
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
  );
};

export default Dashboard;