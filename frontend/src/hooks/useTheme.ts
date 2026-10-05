import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

const KEY = 'doskadel_theme';

const getInitial = (): Theme => {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark'; // по умолчанию тёмная
};

const apply = (t: Theme) => {
  document.documentElement.setAttribute('data-theme', t);
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, setTheme, toggle };
};
