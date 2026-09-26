import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="dashboard">
      <h1>Добро пожаловать в WorkList</h1>
      <nav>
        <ul>
          <li><Link to="/tasks">Мои задачи</Link></li>
          <li><Link to="/diary">Дневник</Link></li>
          <li><Link to="/search">Поиск</Link></li>
        </ul>
      </nav>
      <button onClick={handleLogout} style={{ marginTop: '20px' }}>Выйти</button>
    </div>
  );
};

export default Dashboard;