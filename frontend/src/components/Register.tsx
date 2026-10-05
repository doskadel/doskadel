import React, { useState } from 'react';
import api from '../utils/api';
import PasswordInput from './PasswordInput';
import AuthLayout from './AuthLayout';
import { useNavigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', { username, email, password });
      navigate('/login');
    } catch (err) {
      setError('Ошибка регистрации');
      console.error('Registration error:', err);
    }
  };

  return (
    <AuthLayout
      title="Регистрация"
      error={error}
      footer={<>Уже есть аккаунт? <Link to="/login">Войти</Link></>}
    >
      <form onSubmit={handleSubmit} className="form">
        <label className="input-label input-label--required">Имя пользователя</label>
        <input type="text" placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} className="input" autoComplete="username" required />
        <label className="input-label input-label--required">Email</label>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" inputMode="email" required />
        <label className="input-label input-label--required">Пароль</label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" required />
        <button type="submit" className="button auth-submit">Зарегистрироваться</button>
      </form>
    </AuthLayout>
  );
};

export default Register;
