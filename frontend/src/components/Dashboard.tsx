import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Settings } from 'lucide-react';
import Modal from './Modal';
import PullToRefresh from './PullToRefresh';
import LoadingOverlay from './LoadingOverlay';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
  const [byStatusOrder, setByStatusOrder] = useState<string[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upcomingDays, setUpcomingDays] = useState<number>(3);
  const [allStatuses, setAllStatuses] = useState<Array<{ _id: string; name: string; key?: string | null }>>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [blocks, setBlocks] = useState<Array<{ id: string; visible: boolean; order: number; config: any }>>([]);

  const BLOCK_LABELS: Record<string, string> = {
    byStatus: 'Задачи по статусам',
    overdue: 'Просрочено',
    upcoming: 'Ближайшие сроки',
    recentTasks: 'Последние задачи',
    recentArticles: 'Последние статьи',
  };

  useEffect(() => {
    fetchDashboard();
    api.get('/api/settings/dashboard')
      .then((r) => {
        const bl = r.data?.settings?.blocks || [];
        setBlocks(bl);
        const b = bl.find((x: any) => x.id === 'byStatus');
        setByStatusOrder(b && b.config ? (b.config.statusIds || []) : []);
        if (r.data?.settings?.upcomingDays) setUpcomingDays(r.data.settings.upcomingDays);
      })
      .catch(() => setByStatusOrder([]));
    api.get('/api/statuses')
      .then((r) => setAllStatuses(r.data?.statuses || []))
      .catch(() => {});
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

  // Статусы для блока: только выбранные в настройках, в их порядке, пустые скрыты.
  const visibleStatuses = (() => {
    const counts = data.statusCounts.filter((s) => s.count > 0);
    if (byStatusOrder === null) return counts; // настройки ещё грузятся
    const orderMap = new Map(byStatusOrder.map((id, i) => [id, i]));
    return counts
      .filter((s) => orderMap.has(s.statusId))
      .sort((a, b) => (orderMap.get(a.statusId)! - orderMap.get(b.statusId)!));
  })();

  const moveBlock = (id: string, dir: -1 | 1) => {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
    setBlocks(sorted.map((b, i) => ({ ...b, order: i })));
  };

  const sectionOrder = (id: string): number => {
    const b = blocks.find((x) => x.id === id);
    return b ? b.order : 99;
  };
  const blockVisible = (id: string): boolean => {
    const b = blocks.find((x) => x.id === id);
    return b ? b.visible : true;
  };

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
            className="button button--white"
            onClick={() => navigate('/tasks?new=1')}
          >
            + Добавить задачу
          </button>
          <button
            type="button"
            className="button"
            onClick={() => navigate('/knowledge?new=1')}
          >
            + Добавить статью
          </button>
          <button
            type="button"
            className="icon-button settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Настройки дашборда"
            aria-label="Настройки дашборда"
          >
            <Settings size={20} />
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
        <div className="dashboard-sections">
          {/* --- ПРОСРОЧЕНО --- */}
          {blockVisible('overdue') && data.overdueTasks.length > 0 && (
            <div className="dashboard-section" style={{ order: sectionOrder('overdue') }}>
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
          {blockVisible('upcoming') && data.upcomingTasks.length > 0 && (
            <div className="dashboard-section" style={{ order: sectionOrder('upcoming') }}>
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
          {blockVisible('byStatus') && visibleStatuses.length > 0 && (
            <div className="dashboard-section" style={{ order: sectionOrder('byStatus') }}>
              <h3 className="dashboard-section-title">Задачи по статусам</h3>
              <div className="dashboard-status-grid">
                {visibleStatuses.map((s) => (
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
          {/* (visible/order ниже) */}
          {blockVisible('recentTasks') && data.recentTasks.length > 0 && (
            <div className="dashboard-section" style={{ order: sectionOrder('recentTasks') }}>
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
                    <span className="dashboard-item-title">{t.title}</span>
                    <span className="dashboard-item-date">{formatDate(t.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- ПОСЛЕДНИЕ СТАТЬИ --- */}
          {blockVisible('recentArticles') && data.recentArticles.length > 0 && (
            <div className="dashboard-section" style={{ order: sectionOrder('recentArticles') }}>
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
        </div>
      )}

      {settingsOpen && (
        <Modal open onClose={() => setSettingsOpen(false)} title="Настройки дашборда">
          <div className="fb-field">
            <span className="fb-field-label">Блоки и порядок</span>
            {[...blocks].sort((a, b) => a.order - b.order).map((b, i, arr) => (
              <div key={b.id} className="dash-block-row">
                <input
                  type="checkbox"
                  checked={b.visible}
                  onChange={() => setBlocks(blocks.map((x) => x.id === b.id ? { ...x, visible: !x.visible } : x))}
                />
                <span className="dash-block-name">{BLOCK_LABELS[b.id] || b.id}</span>
                {(b.id === 'recentTasks' || b.id === 'recentArticles') && (
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={(b.config && b.config.limit) || 5}
                    onChange={(e) => {
                      const lim = Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1));
                      setBlocks(blocks.map((x) => x.id === b.id ? { ...x, config: { ...(x.config || {}), limit: lim } } : x));
                    }}
                    className="dash-num"
                    title="Сколько элементов показывать"
                  />
                )}
                <button type="button" className="dash-arrow" disabled={i === 0}
                  onClick={() => moveBlock(b.id, -1)} aria-label="Выше">↑</button>
                <button type="button" className="dash-arrow" disabled={i === arr.length - 1}
                  onClick={() => moveBlock(b.id, 1)} aria-label="Ниже">↓</button>
              </div>
            ))}
          </div>

          <div className="fb-field" style={{ marginTop: 12 }}>
            <span className="fb-field-label">Показывать статусы</span>
            {allStatuses.map((s) => {
              const checked = (byStatusOrder || []).includes(s._id);
              return (
                <label key={s._id} className="dash-set-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const cur = byStatusOrder || [];
                      setByStatusOrder(checked ? cur.filter((x) => x !== s._id) : [...cur, s._id]);
                    }}
                  />
                  <span>{s.name}</span>
                </label>
              );
            })}
          </div>
          <div className="fb-field" style={{ marginTop: 12 }}>
            <span className="fb-field-label">«Ближайшие сроки» — за сколько дней</span>
            <input
              type="number"
              min={1}
              max={30}
              value={upcomingDays}
              onChange={(e) => setUpcomingDays(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              className="input"
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              className="button button--white"
              onClick={() => {
                setBlocks(blocks.map((b, i) => ({ ...b, order: i, visible: true })));
                setUpcomingDays(3);
                setByStatusOrder([]);
              }}
            >
              Сбросить по умолчанию
            </button>
            <button
              type="button"
              className="button"
              disabled={savingSettings}
              onClick={async () => {
                setSavingSettings(true);
                try {
                  const outBlocks = blocks.map((b) =>
                    b.id === 'byStatus' ? { ...b, config: { ...(b.config || {}), statusIds: byStatusOrder || [] } } : b
                  );
                  await api.put('/api/settings/dashboard', { upcomingDays, blocks: outBlocks });
                  setSettingsOpen(false);
                  fetchDashboard();
                } catch (e) {
                  console.error('save dashboard settings', e);
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              Сохранить
            </button>
          </div>
        </Modal>
      )}
    </div>
    </PullToRefresh>
  );
};

export default Dashboard;