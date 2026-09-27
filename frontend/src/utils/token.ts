export const getToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const setToken = (token: string, remember: boolean): void => {
  if (remember) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
};

export const clearToken = (): void => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};