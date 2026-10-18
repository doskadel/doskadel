import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

/** Страница подтверждения почты по ссылке из письма (/verify-email?token=...). */
const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setMessage('Ссылка недействительна'); return; }
    api.get('/api/auth/verify-email', { params: { token } })
      .then(() => setState('ok'))
      .catch((e) => { setState('error'); setMessage(e?.response?.data?.message || 'Не удалось подтвердить почту'); });
  }, [token]);

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        {state === 'loading' && <p>Проверяем ссылку…</p>}
        {state === 'ok' && (<>
          <h2>Почта подтверждена ✓</h2>
          <p>Спасибо! Теперь можно пользоваться DoskaDel.</p>
          <Link to="/" className="button">На главную</Link>
        </>)}
        {state === 'error' && (<>
          <h2>Не получилось</h2>
          <p>{message}</p>
          <Link to="/" className="button">На главную</Link>
        </>)}
      </div>
    </div>
  );
};

export default VerifyEmail;
