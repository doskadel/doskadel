import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

/** Форма задания нового пароля по ссылке из письма (/reset-password?token=...). */
const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setBusy(true); setError('');
    try { await api.post('/api/auth/reset-password', { token, password }); setDone(true); }
    catch (err: any) { setError(err?.response?.data?.message || 'Не удалось изменить пароль'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Новый пароль</h1>
        {!token ? (
          <p className="auth-hint">Ссылка недействительна. <Link to="/forgot-password">Запросить снова</Link></p>
        ) : done ? (
          <p className="auth-hint">Пароль изменён. <Link to="/login">Войти</Link></p>
        ) : (
          <form onSubmit={submit} className="form">
            <input className="input" type="password" placeholder="Новый пароль" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoFocus />
            {error && <p className="auth-error">{error}</p>}
            <button className="button" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сменить пароль'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
