import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, BookOpen, User, Bot, MoreHorizontal, Search } from 'lucide-react';
import SearchModal from './SearchModal';
import ProfileModal from './ProfileModal';
import api from '../utils/api';
import { useGlobalHotkey } from '../hooks/useGlobalHotkey';
import BotStub from './BotStub';
import MoreDropdown from './MoreDropdown';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);

  // Ctrl/Cmd+K — открыть/закрыть поиск; '/' — открыть (когда фокус не в поле)
  useGlobalHotkey({ keyCode: 'KeyK', onTrigger: () => setSearchOpen((v) => !v) });
  useGlobalHotkey({ key: '/', onTrigger: () => setSearchOpen(true) });


  const segments = location.pathname.split('/').filter(Boolean);
  // Кнопка «Назад» только на вложенных экранах (задача/статья), не на корневых разделах.
  const isNested = segments.length > 1;

  const getParentPath = (path: string): string => {
    const segs = path.split('/').filter(Boolean);
    if (segs.length <= 1) return '/';
    return '/' + segs.slice(0, -1).join('/');
  };

  const parentPath = getParentPath(location.pathname);

  const handleBack = () => {
    navigate(parentPath);
  };

  // ============================================================
  // SW → CONFIRM_OCCURRENCE: подтверждаем occurrence из пуша
  // ============================================================
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'CONFIRM_OCCURRENCE') return;

      const occurrenceId = data.occurrenceId;
      if (!occurrenceId) return;

      try {
        // F1c: подтверждение из пуша — через новый action (done по taskId+originalDate)
        const occ = await api.get(`/api/occurrences/${occurrenceId}`);
        const { taskId, originalDate } = occ.data.occurrence || {};
        if (taskId && originalDate) {
          await api.post('/api/occurrences/action', { taskId, originalDate, action: 'done' });
          window.dispatchEvent(new CustomEvent('doskadel:occurrence-updated'));
        }
      } catch (err) {
        console.error('[SW-MSG] Failed to confirm occurrence:', err);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Главная', icon: <Home size={18} /> },
    { path: '/tasks', label: 'Мои задачи', icon: <CheckSquare size={18} /> },
    { path: '/knowledge', label: 'База знаний', icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-inner">
          <div className="layout-header-left">
            {isNested && (
              <button onClick={handleBack} className="layout-back" title="Назад">←</button>
            )}
            <Link to="/" className="layout-logo">DoskaDel</Link>

            {/* Навигация для ПК/широких экранов */}
            <nav className="layout-nav layout-nav--desktop" aria-label="Основная навигация">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={isActive(item.path) ? 'layout-nav-link layout-nav-link--active' : 'layout-nav-link'}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              <MoreDropdown />
            </nav>
          </div>

          <div className="layout-header-right">
            {/* Поиск — действие справа */}
            <button
              type="button"
              className="layout-search-btn"
              onClick={() => setSearchOpen(true)}
              title={`Поиск (${isMac ? '⌘' : 'Ctrl'}+K)`}
              aria-label="Открыть поиск"
              aria-haspopup="dialog"
            >
              <Search size={18} />
              <span className="layout-search-text">Поиск</span>
              <kbd className="layout-search-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            {/* Бот — заглушка, паритет с мобилкой */}
            <button
              type="button"
              className="layout-bot-btn"
              onClick={() => setBotOpen(true)}
              title="Помощник"
              aria-label="Помощник"
            >
              <Bot size={18} />
              <span className="layout-bot-text">Помощник</span>
            </button>
            <button
              type="button"
              className="layout-avatar"
              onClick={() => setProfileOpen(true)}
              title="Профиль"
              aria-label="Профиль"
            >
              <span className="layout-avatar-inner"><User size={20} /></span>
            </button>
          </div>
        </div>
      </header>

      <main className="layout-main">
        <div className="layout-container">{children}</div>
      </main>

      {/* Нижний бар для планшетов и мобильных */}
      <nav className="layout-bottom-nav">
        <Link to="/" className={isActive('/') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon"><Home size={20} /></span>
          <span className="bottom-nav-label">Главная</span>
        </Link>
        <Link to="/tasks" className={isActive('/tasks') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon"><CheckSquare size={20} /></span>
          <span className="bottom-nav-label">Задачи</span>
        </Link>
        <button
          type="button"
          className="bottom-nav-bot"
          onClick={() => setBotOpen(true)}
          title="Помощник"
          aria-label="Помощник"
        >
          <span className="bottom-nav-bot-inner"><Bot size={24} /></span>
        </button>
        <Link to="/knowledge" className={isActive('/knowledge') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon"><BookOpen size={20} /></span>
          <span className="bottom-nav-label">База</span>
        </Link>
        <Link to="/more" className={isActive('/more') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon"><MoreHorizontal size={20} /></span>
          <span className="bottom-nav-label">Ещё</span>
        </Link>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <BotStub open={botOpen} onClose={() => setBotOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Layout;
