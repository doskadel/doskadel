import api from './api';

export interface Tag {
  _id: string;
  name: string;
  color?: string | null;
  count?: number;
}

export const listTags = (): Promise<Tag[]> =>
  api.get('/api/tags').then((r) => r.data.tags || []);

export const createTag = (name: string, color?: string | null): Promise<Tag> =>
  api.post('/api/tags', { name, color }).then((r) => r.data.tag);

export const updateTag = (id: string, data: { name?: string; color?: string | null }): Promise<Tag> =>
  api.put(`/api/tags/${id}`, data).then((r) => r.data.tag);

export const deleteTag = (id: string): Promise<void> =>
  api.delete(`/api/tags/${id}`).then(() => undefined);

export const mergeTag = (srcId: string, targetId: string): Promise<void> =>
  api.post(`/api/tags/${srcId}/merge`, { targetId }).then(() => undefined);
