import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

/** Форма «Забыли пароль?» — запрос письма со ссылкой сброса. */
const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/api/auth/forgot-password', { email }); setSent(true); }
    catch { setSent(true); } // не раскрываем существование аккаунта
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Восстановление пароля</h1>
        {sent ? (
          <p className="auth-hint">Если аккаунт с такой почтой существует, мы отправили письмо со ссылкой. Проверьте «Входящие» и «Спам».</p>
        ) : (
          <form onSubmit={submit} className="form">
            <input className="input" type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            <button className="button" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить ссылку'}</button>
          </form>
        )}
        <p className="auth-switch"><Link to="/login">Вернуться ко входу</Link></p>
      </div>
    </div>
  );
};

export default ForgotPassword;
