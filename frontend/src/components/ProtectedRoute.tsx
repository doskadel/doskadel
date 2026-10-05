import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, setToken } from '../utils/token';
import Skeleton from './Skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
}

// При старте access-токена в памяти нет (он не в localStorage).
// Пробуем получить его через refresh-cookie; если не вышло — на логин.
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [state, setState] = useState<'checking' | 'ok' | 'no'>(getToken() ? 'ok' : 'checking');

  useEffect(() => {
    if (state !== 'checking') return;
    let cancelled = false;
    axios.post('/api/auth/refresh', {}, { withCredentials: true })
      .then((resp) => {
        if (cancelled) return;
        if (resp.data?.token) {
          setToken(resp.data.token);
          setState('ok');
        } else {
          setState('no');
        }
      })
      .catch(() => { if (!cancelled) setState('no'); });
    return () => { cancelled = true; };
  }, [state]);

  if (state === 'checking') {
    return <Skeleton />;
  }
  if (state === 'no') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
