import React, { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/token';
import SearchModal from './SearchModal';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const isRoot = location.pathname === '/';

  const getParentPath = (path: string): string => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) return '/';
    return '/' + segments.slice(0, -1).join('/');
  };

  const parentPath = getParentPath(location.pathname);

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  const handleBack = () => {
    navigate(parentPath);
  };

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
            WorkList
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
          <button onClick={handleLogout} className="layout-logout">
            Выйти
          </button>
        </nav>
      </header>
      <main className="layout-main">
        <div className="layout-container">{children}</div>
      </main>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default Layout;