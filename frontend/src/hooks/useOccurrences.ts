import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export interface Occurrence {
  _id: string;
  taskId: string;
  userId: string;
  originalDate: string;
  dueAt: string;
  status: 'pending' | 'done' | 'skipped' | 'missed';
  completedAt?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OccurrenceAction = 'done' | 'skip' | 'undo' | 'move';
export type OccurrenceScope = 'this' | 'following' | 'all';

export interface UseOccurrencesResult {
  // Все pending (включая будущие) — для внутренней логики
  pending: Occurrence[];
  // Только с dueAt <= now (просроченные/наступившие) — для UI
  pendingDue: Occurrence[];
  // Все подтверждённые
  done: Occurrence[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  confirmIds: (ids: string[]) => Promise<void>;
  unconfirmIds: (ids: string[]) => Promise<void>;
  act: (params: { taskId: string; originalDate: string; action: OccurrenceAction; dueAt?: string; scope?: OccurrenceScope }) => Promise<void>;
  completeSeries: (tid: string) => Promise<void>;
}

export const useOccurrences = (taskId: string | null): UseOccurrencesResult => {
  const [pending, setPending] = useState<Occurrence[]>([]);
  const [done, setDone] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const [p, d] = await Promise.all([
        api.get(`/api/occurrences/by-task/${id}?status=pending`),
        api.get(`/api/occurrences/by-task/${id}?status=done`),
      ]);
      setPending(p.data.occurrences || []);
      setDone(d.data.occurrences || []);
    } catch (err: any) {
      console.error('Error fetching occurrences:', err);
      setError(err.response?.data?.message || 'Не удалось загрузить вхождения');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
      setPending([]);
      setDone([]);
      return;
    }
    fetchAll(taskId);
  }, [taskId, fetchAll]);

  const refresh = async () => {
    if (!taskId) return;
    await fetchAll(taskId);
  };

  const confirmIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    await api.put('/api/occurrences/confirm', { ids });
    await refresh();
  };

  const unconfirmIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    await api.put('/api/occurrences/unconfirm', { ids });
    await refresh();
  };

  /** Действие над вхождением (F1c): done/skip/undo/move. */
  const act = async (params: {
    taskId: string; originalDate: string; action: OccurrenceAction; dueAt?: string; scope?: OccurrenceScope;
  }) => {
    await api.post('/api/occurrences/action', params);
    await refresh();
  };

  /** Ручное завершение серии (бессрочной). */
  const completeSeries = async (tid: string) => {
    await api.post('/api/occurrences/complete-series', { taskId: tid });
  };

  // Только наступившие pending (dueAt <= now)
  const now = Date.now();
  const pendingDue = pending.filter((o) => new Date(o.dueAt).getTime() <= now);

  return {
    pending,
    pendingDue,
    done,
    loading,
    error,
    refresh,
    confirmIds,
    unconfirmIds,
    act,
    completeSeries,
  };
};