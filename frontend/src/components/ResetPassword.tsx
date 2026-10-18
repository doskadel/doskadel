import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';

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
    <AuthLayout
      title="Новый пароль"
      error={error || undefined}
      footer={<Link to="/login">Вернуться ко входу</Link>}
    >
      {!token ? (
        <p className="auth-subtitle" style={{ textAlign: 'left' }}>Ссылка недействительна. <Link to="/forgot-password">Запросить снова</Link></p>
      ) : done ? (
        <p className="auth-subtitle" style={{ textAlign: 'left' }}>Пароль изменён. <Link to="/login">Войти</Link></p>
      ) : (
        <form onSubmit={submit} className="form">
          <PasswordInput value={password} onChange={setPassword} placeholder="Новый пароль" autoComplete="new-password" required />
          <button className="button auth-submit" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сменить пароль'}</button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
