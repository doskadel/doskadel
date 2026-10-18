import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import AuthLayout from './AuthLayout';

/** Форма «Забыли пароль?» — запрос письма со ссылкой сброса. */
const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/api/auth/forgot-password', { email }); setSent(true); }
    catch { setSent(true); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout
      title="Восстановление пароля"
      subtitle={sent ? undefined : 'Укажите почту — пришлём ссылку для сброса пароля'}
      footer={<><Link to="/login">Вернуться ко входу</Link></>}
    >
      {sent ? (
        <p className="auth-subtitle" style={{ textAlign: 'left' }}>
          Если аккаунт с такой почтой существует, мы отправили письмо со ссылкой. Проверьте «Входящие» и «Спам».
        </p>
      ) : (
        <form onSubmit={submit} className="form">
          <input className="input" type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required autoFocus />
          <button className="button auth-submit" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить ссылку'}</button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
