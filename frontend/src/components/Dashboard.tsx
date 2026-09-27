import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h2 className="page-title">Добро пожаловать в WorkList</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Используйте навигацию сверху, чтобы перейти к задачам, дневнику или поиску.
      </p>
    </div>
  );
};

export default Dashboard;