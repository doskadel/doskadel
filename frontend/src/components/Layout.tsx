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
        console.log('[SW-MSG] Occurrence confirmed:', occurrenceId);
        // Дадим окну знать, что данные изменились — оно перезапросит задачи
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

  const navItems = [
    { path: '/', label: 'Главная' },
    { path: '/tasks', label: 'Мои задачи' },
    { path: '/knowledge', label: 'База знаний' },
  ];

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-left">
          {!isRoot && (
            <button
              onClick={handleBack}
              className="layout-back"
              title="Назад"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ←
            </button>
          )}
          <Link to="/" className="layout-logo">
            DoskaDel
          </Link>
        </div>
        <nav className="layout-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={
                location.pathname === item.path
                  ? 'layout-nav-link layout-nav-link--active'
                  : 'layout-nav-link'
              }
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
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Layout;