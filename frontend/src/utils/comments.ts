import api from './api';

export interface CommentAtt {
  _id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface CommentItem {
  _id: string;
  parentId: string | null;
  replyToUserId: string | null;
  authorId: string;
  content: string;
  contentJson: any;
  format: 'md' | 'json';
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
  attachments: CommentAtt[];
}

export const listComments = (ownerType: 'task' | 'article', ownerId: string): Promise<CommentItem[]> =>
  api.get('/api/comments', { params: { ownerType, ownerId } }).then((r) => r.data.comments || []);

export const createComment = (payload: {
  ownerType: 'task' | 'article';
  ownerId: string;
  parentId?: string | null;
  replyToUserId?: string | null;
  content?: string;
  contentJson?: any;
  attachments?: string[];
}): Promise<CommentItem> => api.post('/api/comments', payload).then((r) => r.data.comment);

export const updateComment = (id: string, payload: { content?: string; contentJson?: any }): Promise<CommentItem> =>
  api.put(`/api/comments/${id}`, payload).then((r) => r.data.comment);

export const deleteComment = (id: string): Promise<void> =>
  api.delete(`/api/comments/${id}`).then(() => undefined);
