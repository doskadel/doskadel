import api from './api';

export interface LinkedEntity {
  linkId: string;
  type: 'task' | 'article';
  id: string;
  title: string;
  statusId?: string | null;
  statusName?: string | null;
  isFinal?: boolean;
  priority?: number | null;
}

export const listLinks = (type: 'task' | 'article', id: string): Promise<LinkedEntity[]> =>
  api.get('/api/links', { params: { type, id } }).then((r) => r.data.links || []);

export const createLink = (fromType: 'task' | 'article', fromId: string, toType: 'task' | 'article', toId: string): Promise<void> =>
  api.post('/api/links', { fromType, fromId, toType, toId }).then(() => undefined);

export const deleteLink = (id: string): Promise<void> =>
  api.delete(`/api/links/${id}`).then(() => undefined);
