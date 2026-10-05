import React, { useState } from 'react';
import api from '../utils/api';
import PasswordInput from './PasswordInput';
import AuthLayout from './AuthLayout';
import { useNavigate, Link } from 'react-router-dom';
import { setToken } from '../utils/token';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/login', { email, password, remember });
      const { token } = response.data;
      setToken(token);
      navigate('/');
    } catch (err) {
      setError('Неверный email или пароль');
      console.error('Login error:', err);
    }
  };

  return (
    <AuthLayout
      title="Вход"
      error={error}
      footer={<>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></>}
    >
      <form onSubmit={handleSubmit} className="form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          autoComplete="email"
          inputMode="email"
          required
        />
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" required />
        <label className="auth-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Запомнить меня</span>
        </label>
        <button type="submit" className="button auth-submit">Войти</button>
      </form>
    </AuthLayout>
  );
};

export default Login;
