import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, setToken, clearToken } from './token';

// Относительный /api: dev — через CRA-proxy, прод — через reverse-proxy.
// Refresh-токен живёт в httpOnly cookie (ставит сервер), JS его не видит.
export const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Автообновление access при 401 (refresh уходит cookie автоматически).
let refreshing: Promise<string | null> | null = null;

const doRefresh = async (): Promise<string | null> => {
  try {
    const resp = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
    if (resp.data?.token) {
      setToken(resp.data.token);
      return resp.data.token;
    }
    return null;
  } catch {
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
