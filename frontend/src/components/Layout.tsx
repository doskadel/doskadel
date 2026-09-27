import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clearToken } from '../utils/token';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  const handleLogout = () => {
    clearToken();
    window.location.href = '/login';
  };

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd',
      marginBottom: '20px'
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    },
    nav: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center'
    },
    backBtn: {
      textDecoration: 'none',
      color: '#007bff',
      fontSize: '20px',
      padding: '4px 8px'
    },
    logoutBtn: {
      padding: '6px 12px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    content: {
      padding: '0 20px'
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={styles.header}>
        <div style={styles.left}>
          {!isDashboard && (
            <Link to="/" style={styles.backBtn} title="На главную">←</Link>
          )}
          <h1 style={{ margin: 0, fontSize: '24px' }}>WorkList</h1>
        </div>
        <nav style={styles.nav}>
          <Link to="/tasks" style={{ textDecoration: 'none', color: '#007bff' }}>Мои задачи</Link>
          <Link to="/diary" style={{ textDecoration: 'none', color: '#007bff' }}>Дневник</Link>
          <Link to="/search" style={{ textDecoration: 'none', color: '#007bff' }}>Поиск</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>Выйти</button>
        </nav>
      </header>
      <main style={styles.content}>
        <div>{children}</div>
      </main>
    </div>
  );
};

export default Layout;