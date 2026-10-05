import React, { useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Settings, ChevronDown, CheckSquare, FileText, Plus, ArrowRight } from 'lucide-react';
import SortableSettings from './shared/SortableSettings';
import { useConfirm } from './ConfirmProvider';
import { useToast } from './Toast';
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
  const confirm = useConfirm();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [byStatusOrder, setByStatusOrder] = useState<string[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSnap, setSettingsSnap] = useState<{ blocks: any; byStatusOrder: any; upcomingDays: number; numStr?: Record<string, string> } | null>(null);
  const buildNumStr = (bl: any[], days: number): Record<string, string> => {
    const ns: Record<string, string> = { upcomingDays: String(days) };
    bl.forEach((b) => {
      if (b.id === 'recentTasks' || b.id === 'recentArticles' || b.id === 'overdue' || b.id === 'upcoming') {
        ns['limit:' + b.id] = String((b.config && b.config.limit) || 5);
      }
    });
    return ns;
  };

  const openSettings = () => {
    setSettingsSnap({ blocks, byStatusOrder, upcomingDays, numStr: buildNumStr(blocks, upcomingDays) });
    setNumStr(buildNumStr(blocks, upcomingDays));
    setSettingsErr('');
    setSettingsOpen(true);
  };
  const MAX = { upcomingDays: 30, limit: 20 };
  const onNumInput = (key: string, raw: string, max: number) => {
    let v = raw.replace(/[^0-9]/g, '');
    v = v.replace(/^0+/, ''); // убрать ведущие нули (и «только 0» -> пусто)
    if (v !== '' && parseInt(v, 10) > max) v = String(max);
    setNumStr((prev) => ({ ...prev, [key]: v }));
    setSettingsErr('');
  };
  const numErr = (key: string) => numStr[key] === '' || numStr[key] === undefined;

  const closeSettings = async () => {
    const changed =
      !!settingsSnap &&
      JSON.stringify([blocks, byStatusOrder, upcomingDays, numStr]) !==
        JSON.stringify([settingsSnap.blocks, settingsSnap.byStatusOrder, settingsSnap.upcomingDays, settingsSnap.numStr]);
    if (changed && settingsSnap) {
      const ok = await confirm({
        title: 'Есть несохранённые данные',
        message: 'Изменения не будут сохранены. Выйти без сохранения?',
        confirmLabel: 'Выйти без сохранения',
        danger: true,
      });
      if (!ok) return;
      setBlocks(settingsSnap.blocks);
      setByStatusOrder(settingsSnap.byStatusOrder);
      setUpcomingDays(settingsSnap.upcomingDays);
      if (settingsSnap.numStr) setNumStr(settingsSnap.numStr);
    }
    setSettingsOpen(false);
  };
  const [upcomingDays, setUpcomingDays] = useState<number>(3);
  const [allStatuses, setAllStatuses] = useState<Array<{ _id: string; name: string; key?: string | null }>>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [numStr, setNumStr] = useState<Record<string, string>>({});
  const [settingsErr, setSettingsErr] = useState('');
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
      <h2 className="page-title">Главная</h2>
      <div className="tasks-actions-row">
        <div className="dashboard-actions">
          <Menu as="div" className="create-menu">
            <Menu.Button className="button button--white button--sm create-menu-btn">
              <Plus size={16} /> Создать <span className="create-menu-sep" /> <ChevronDown size={18} />
            </Menu.Button>
            <Transition
              enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to"
              leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from"
            >
              <Menu.Items className="create-menu-panel" static>
                <Menu.Item>
                  {({ close }) => (
                    <button type="button" className="create-menu-item" onClick={() => { close(); navigate('/tasks?new=1'); }}>
                      <CheckSquare size={16} /> Задача
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ close }) => (
                    <button type="button" className="create-menu-item" onClick={() => { close(); navigate('/knowledge?new=1'); }}>
                      <FileText size={16} /> Статья
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
        <button
            type="button"
            className="icon-button settings-btn"
            onClick={openSettings}
            title="Настройки дашборда"
            aria-label="Настройки дашборда"
          >
            <Settings size={20} />
          </button>
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
                  Просрочено
                </h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/tasks?overdue=1')}
                >
                  Все <ArrowRight size={15} />
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
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), navigate(`/tasks?task=${t._id}`))}
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
                  Ближайшие сроки
                </h3>
                <button
                  type="button"
                  className="dashboard-section-link"
                  onClick={() => navigate('/tasks?dueSoon=1')}
                >
                  Все <ArrowRight size={15} />
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
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), navigate(`/tasks?task=${t._id}`))}
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
              <div className="dashboard-section-header">
                <h3 className="dashboard-section-title">Задачи по статусам</h3>
              </div>
              <div className="dashboard-status-grid">
                {visibleStatuses.map((s) => (
                  <div
                    key={s.statusId}
                    className="dashboard-status-card"
                    onClick={() => navigate(`/tasks?statuses=${s.statusId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), navigate(`/tasks?statuses=${s.statusId}`))}
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
                  Все <ArrowRight size={15} />
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
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), navigate(`/tasks?task=${t._id}`))}
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
                  Все <ArrowRight size={15} />
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
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), navigate(`/knowledge?article=${a._id}`))}
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
        <Modal open onClose={closeSettings} title="Настройки дашборда">
          <div className="fb-field">
            <span className="fb-field-label">Блоки и порядок</span>
            <SortableSettings
              items={[...blocks].sort((a, b) => a.order - b.order).map((b) => ({
                id: b.id,
                label: BLOCK_LABELS[b.id] || b.id,
                enabled: b.visible,
                extra: b.visible && (b.id === 'recentTasks' || b.id === 'recentArticles' || b.id === 'overdue' || b.id === 'upcoming') ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numStr['limit:' + b.id] ?? ''}
                    onChange={(e) => onNumInput('limit:' + b.id, e.target.value, 20)}
                    className={'dash-num' + (numErr('limit:' + b.id) ? ' input--error' : '')}
                    title="Сколько элементов показывать (1-20)"
                  />
                ) : undefined,
              }))}
              onToggle={(id) => setBlocks((prev) => prev.map((x) => x.id === id ? { ...x, visible: !x.visible } : x))}
              onReorder={(ids) => setBlocks((prev) => {
                const map = new Map(prev.map((b) => [b.id, b]));
                return ids.map((id, i) => ({ ...(map.get(id) as any), order: i }));
              })}
              toggleAria="Показать/скрыть блок"
            />
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
              type="text"
              inputMode="numeric"
              value={numStr['upcomingDays'] ?? ''}
              onChange={(e) => onNumInput('upcomingDays', e.target.value, 30)}
              className={'input' + (numErr('upcomingDays') ? ' input--error' : '')}
            />
          </div>
          {settingsErr && (
            <p style={{ color: 'var(--color-danger)', fontSize: 14, marginTop: 12, marginBottom: 0 }}>{settingsErr}</p>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="button button--outline dashboard-reset-btn"
              style={{ flex: 1 }}
              disabled={savingSettings}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Сбросить всё по умолчанию?',
                  message: 'Настройки дашборда И статусы вернутся к исходному состоянию. Статусы, созданные вами (без задач), будут удалены, дефолтные — восстановлены.',
                  confirmLabel: 'Сбросить',
                  danger: true,
                });
                if (!ok) return;
                setSavingSettings(true);
                try {
                  const r = await api.post('/api/settings/dashboard/reset');
                  const bl = r.data?.settings?.blocks || [];
                  setBlocks(bl);
                  const b = bl.find((x: any) => x.id === 'byStatus');
                  setByStatusOrder(b && b.config ? (b.config.statusIds || []) : []);
                  const days = r.data?.settings?.upcomingDays ?? 3;
                  setUpcomingDays(days);
                  setNumStr(buildNumStr(bl, days));
                  setSettingsSnap({ blocks: bl, byStatusOrder: b && b.config ? (b.config.statusIds || []) : [], upcomingDays: days, numStr: buildNumStr(bl, days) });
                  const st = await api.get('/api/statuses');
                  setAllStatuses(st.data?.statuses || []);
                  fetchDashboard();
                } catch (e: any) {
                  alert(e?.response?.data?.message || 'Не удалось сбросить');
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              По умолчанию
            </button>
            <button
              type="button"
              className="button"
              style={{ flex: 1 }}
              disabled={savingSettings}
              onClick={async () => {
                // валидация: все числовые поля заполнены (в т.ч. лимиты видимых блоков)
                const need: string[] = ['upcomingDays'];
                blocks.forEach((b) => {
                  if (b.visible && (b.id === 'recentTasks' || b.id === 'recentArticles' || b.id === 'overdue' || b.id === 'upcoming')) need.push('limit:' + b.id);
                });
                const bad = need.some((k) => numStr[k] === '' || numStr[k] === undefined);
                if (bad) {
                  setSettingsErr('Заполните обязательные поля');
                  return;
                }
                setSettingsErr('');
                setSavingSettings(true);
                try {
                  const days = parseInt(numStr['upcomingDays'], 10);
                  const outBlocks = blocks.map((b) => {
                    let config = { ...(b.config || {}) };
                    if (b.id === 'byStatus') config.statusIds = byStatusOrder || [];
                    const lk = 'limit:' + b.id;
                    if (numStr[lk] !== undefined && numStr[lk] !== '') config.limit = parseInt(numStr[lk], 10);
                    return { ...b, config };
                  });
                  await api.put('/api/settings/dashboard', { upcomingDays: days, blocks: outBlocks });
                  setBlocks(outBlocks);
                  setUpcomingDays(days);
                  setNumStr(buildNumStr(outBlocks, days));
                  setSettingsOpen(false);
                  fetchDashboard();
                  toast('Настройки сохранены', 'success');
                } catch (e: any) {
                  console.error('save dashboard settings', e);
                  setSettingsErr('Не удалось сохранить');
                  toast(e?.response?.data?.message || 'Не удалось сохранить настройки', 'error');
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