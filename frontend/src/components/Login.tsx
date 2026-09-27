import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { setToken } from '../utils/token';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      const { token } = response.data;
      setToken(token, remember);
      navigate('/');
    } catch (err) {
      setError('Неверный email или пароль');
      console.error('Login error:', err);
    }
  };

return (
  <div className="auth-wrapper">
    <div className="auth-card">
      <h2>Вход</h2>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="form">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Запомнить меня
        </label>
        <button type="submit" className="button">Войти</button>
      </form>
      <p className="auth-footer">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  </div>
);
};

export default Login;