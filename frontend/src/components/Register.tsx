import React, { useState } from 'react';
import axios from 'axios';
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
      await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password
      });
      
      navigate('/login');
    } catch (err) {
      setError('Ошибка регистрации');
      console.error('Registration error:', err);
    }
  };

return (
  <div className="auth-wrapper">
    <div className="auth-card">
      <h2>Регистрация</h2>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="form">
        <input type="text" placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} className="input" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        <button type="submit" className="button">Зарегистрироваться</button>
      </form>
      <p className="auth-footer">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  </div>
);
};

export default Register;