import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SearchModal from './SearchModal';
import ProfileModal from './ProfileModal';
import api from '../utils/api';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isRoot = location.pathname === '/';

  const getParentPath = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) return '/';
    return '/' + segments.slice(0, -1).join('/');
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
        await api.put('/api/occurrences/confirm', { ids: [occurrenceId] });
        window.dispatchEvent(new CustomEvent('doskadel:occurrence-updated'));
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
    { path: '/', label: 'Главная', icon: '🏠' },
    { path: '/tasks', label: 'Мои задачи', icon: '✓' },
    { path: '/knowledge', label: 'База знаний', icon: '📚' },
  ];

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-left">
          {!isRoot && (
            <button onClick={handleBack} className="layout-back" title="Назад">←</button>
          )}
          <Link to="/" className="layout-logo">DoskaDel</Link>
        </div>

        {/* Навигация для ПК/широких экранов */}
        <nav className="layout-nav layout-nav--desktop">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={isActive(item.path) ? 'layout-nav-link layout-nav-link--active' : 'layout-nav-link'}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="layout-nav-link layout-nav-link--button"
            onClick={() => setSearchOpen(true)}
            title="Поиск"
          >
            Поиск
          </button>
          <button
            type="button"
            className="layout-avatar"
            onClick={() => setProfileOpen(true)}
            title="Профиль"
            aria-label="Профиль"
          >
            <span className="layout-avatar-inner">👤</span>
          </button>
        </nav>
      </header>

      <main className="layout-main">
        <div className="layout-container">{children}</div>
      </main>

      {/* Нижний бар для планшетов и мобильных */}
      <nav className="layout-bottom-nav">
        <Link to="/" className={isActive('/') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Главная</span>
        </Link>
        <Link to="/tasks" className={isActive('/tasks') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon">✓</span>
          <span className="bottom-nav-label">Задачи</span>
        </Link>
        <button
          type="button"
          className="bottom-nav-bot"
          onClick={() => setSearchOpen(true)}
          title="Помощник"
          aria-label="Помощник"
        >
          <span className="bottom-nav-bot-inner">🤖</span>
        </button>
        <Link to="/knowledge" className={isActive('/knowledge') ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}>
          <span className="bottom-nav-icon">📚</span>
          <span className="bottom-nav-label">База</span>
        </Link>
        <button
          type="button"
          className={moreOpen ? 'bottom-nav-item bottom-nav-item--active' : 'bottom-nav-item'}
          onClick={() => setMoreOpen(true)}
          title="Ещё"
          aria-label="Ещё"
        >
          <span className="bottom-nav-icon">⋯</span>
          <span className="bottom-nav-label">Ещё</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <button
              className="more-sheet-item"
              onClick={() => { setMoreOpen(false); setSearchOpen(true); }}
            >
              <span className="more-sheet-icon">🔍</span> Поиск
            </button>
            <button
              className="more-sheet-item"
              onClick={() => { setMoreOpen(false); setProfileOpen(true); }}
            >
              <span className="more-sheet-icon">👤</span> Профиль и настройки
            </button>
          </div>
        </div>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Layout;
