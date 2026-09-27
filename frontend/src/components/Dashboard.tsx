import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1>Добро пожаловать в WorkList</h1>
      <p style={{ marginTop: '20px', color: '#666' }}>
        Используйте навигацию сверху, чтобы перейти к задачам, дневнику или поиску.
      </p>
    </div>
  );
};

export default Dashboard;