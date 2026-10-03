import { useEffect, useState } from 'react';
import api from '../utils/api';

// Единый источник порога «Ближайшие N дней». Кэшируем в модуле,
// чтобы не дёргать API из каждого компонента.
let cached: number | null = null;
let inflight: Promise<number> | null = null;

const load = (): Promise<number> => {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = api.get('/api/settings/dashboard')
      .then((r) => {
        cached = r.data?.settings?.upcomingDays ?? 3;
        return cached as number;
      })
      .catch(() => 3)
      .finally(() => { inflight = null; });
  }
  return inflight;
};

export const useUpcomingDays = (): number => {
  const [days, setDays] = useState<number>(cached ?? 3);
  useEffect(() => {
    let on = true;
    load().then((d) => { if (on) setDays(d); });
    return () => { on = false; };
  }, []);
  return days;
};
