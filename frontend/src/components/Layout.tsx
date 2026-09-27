import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/token';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Уровень 1 — корень, без стрелки
  const isRoot = location.pathname === '/';

  // Родительский путь: отрезаем последний сегмент
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
    { path: '/tasks', label: 'Мои задачи' },
    { path: '/diary', label: 'Дневник' },
    { path: '/search', label: 'Поиск' },
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
          <button onClick={handleLogout} className="layout-logout">
            Выйти
          </button>
        </nav>
      </header>
      <main className="layout-main">
        <div className="layout-container">{children}</div>
      </main>
    </div>
  );
};

export default Layout;