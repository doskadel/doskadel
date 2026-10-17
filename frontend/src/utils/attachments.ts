import { useEffect, useState } from 'react';
import api from './api';

export interface AttachmentMeta {
  _id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt?: string;
}

export interface AttachmentConfig {
  maxFileBytes: number;
  workspaceQuotaBytes: number;
  allowedMime: string[];
  inlineMime: string[];
}

/** Загрузка списка вложений владельца. */
export const listAttachments = (ownerType: 'article' | 'task' | 'comment', ownerId: string): Promise<AttachmentMeta[]> =>
  api.get('/api/attachments', { params: { ownerType, ownerId } }).then((r) => r.data.attachments || []);

/** Конфиг лимитов/типов с сервера (единственный источник правды). */
export const getAttachmentsConfig = (): Promise<AttachmentConfig> =>
  api.get('/api/attachments/config').then((r) => r.data);

/** Загрузка файла (multipart). ownerType/ownerId пусты -> pending. */
export const uploadAttachment = (
  file: File,
  owner: { ownerType?: 'article' | 'task' | 'comment'; ownerId?: string },
  onProgress?: (pct: number) => void
): Promise<AttachmentMeta> => {
  const fd = new FormData();
  fd.append('file', file);
  if (owner.ownerType) fd.append('ownerType', owner.ownerType);
  if (owner.ownerId) fd.append('ownerId', owner.ownerId);
  return api.post('/api/attachments', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  }).then((r) => r.data.attachment);
};

/** Привязать pending-вложения к созданной сущности. */
export const attachToOwner = (ownerType: 'article' | 'task', ownerId: string, ids: string[]): Promise<void> =>
  api.post('/api/attachments/attach', { ownerType, ownerId, ids }).then(() => undefined);

export const deleteAttachment = (id: string): Promise<void> =>
  api.delete(`/api/attachments/${id}`).then(() => undefined);

// ---- Кэш objectURL (ревью Клода: refcount, отложенный revoke, дедуп) ----

type Entry = {
  url: string | null;
  promise: Promise<string> | null;
  refs: number;
  abort: AbortController | null;
  revokeTimer: any;
};

const cache = new Map<string, Entry>();
const REVOKE_DELAY = 30_000;

const fetchBlobUrl = (id: string, signal: AbortSignal): Promise<string> =>
  api.get(`/api/attachments/${id}/raw`, { responseType: 'blob', signal }).then((r) => URL.createObjectURL(r.data as Blob));

const acquire = (id: string): { url: string | null; promise: Promise<string> | null } => {
  let e = cache.get(id);
  if (!e) {
    e = { url: null, promise: null, refs: 0, abort: null, revokeTimer: null };
    cache.set(id, e);
  }
  e.refs += 1;
  if (e.revokeTimer) { clearTimeout(e.revokeTimer); e.revokeTimer = null; }
  if (!e.url && !e.promise) {
    e.abort = new AbortController();
    e.promise = fetchBlobUrl(id, e.abort.signal)
      .then((url) => { e!.url = url; e!.promise = null; return url; })
      .catch((err) => { e!.promise = null; if (!e!.abort?.signal.aborted) console.warn('attachment load failed', id, err?.message); throw err; });
  }
  return { url: e.url, promise: e.promise };
};

const release = (id: string) => {
  const e = cache.get(id);
  if (!e) return;
  e.refs -= 1;
  if (e.refs <= 0) {
    e.refs = 0;
    e.revokeTimer = setTimeout(() => {
      const cur = cache.get(id);
      if (cur && cur.refs <= 0) {
        if (cur.url) URL.revokeObjectURL(cur.url);
        cur.abort?.abort();
        cache.delete(id);
      }
    }, REVOKE_DELAY);
  }
};

/** URL для показа вложения (blob). Состояния: loading/error/url. */
export const useAttachmentUrl = (id: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setUrl(null); setError(false); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError(false);
    const { url: cached, promise } = acquire(id);
    if (cached) { setUrl(cached); setLoading(false); }
    else if (promise) {
      promise.then((u) => { if (active) { setUrl(u); setLoading(false); } })
        .catch(() => { if (active) { setError(true); setLoading(false); } });
    }
    return () => { active = false; release(id); };
  }, [id]);

  return { url, loading, error };
};

/** Парсит 'attachment:<id>' -> id. */
export const parseAttachmentId = (src?: string | null): string | null => {
  if (!src) return null;
  const m = /^attachment:([a-f0-9]{24})$/i.exec(src);
  return m ? m[1] : null;
};

// Простое событие: после загрузки/удаления вложения из другого места (редактор) блок списка обновляется.
type AttListener = () => void;
const attListeners = new Set<AttListener>();
export const onAttachmentsChanged = (fn: AttListener): (() => void) => { attListeners.add(fn); return () => { attListeners.delete(fn); }; };
export const notifyAttachmentsChanged = () => { attListeners.forEach((fn) => { try { fn(); } catch {} }); };

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
};
