import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearAuth } from './token';

// Относительный /api: dev — через CRA-proxy (setupProxy.js) на localhost:5000,
// прод — через reverse-proxy. Один origin, cookie first-party.
export const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Автообновление access-токена при 401 (один раз на запрос).
let refreshing: Promise<string | null> | null = null;

const doRefresh = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const resp = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
    if (resp.data?.token) {
      setToken(resp.data.token);
      if (resp.data.refreshToken) setRefreshToken(resp.data.refreshToken);
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
      // refresh не удался — разлогиниваем
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
