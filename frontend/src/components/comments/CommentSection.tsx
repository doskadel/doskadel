import React, { useEffect, useState } from 'react';
import { MessageSquare, Reply, Pencil, Trash2, Send, X } from 'lucide-react';
import { CommentItem, listComments, createComment, updateComment, deleteComment } from '../../utils/comments';
import { uploadAttachment, AttachmentMeta } from '../../utils/attachments';
import RichTextEditor from '../editor/RichTextEditor';
import RichTextRenderer from '../editor/RichTextRenderer';
import AttachmentBlock from '../attachments/AttachmentBlock';
import AttachmentViewer from '../attachments/AttachmentViewer';
import { useToast } from '../Toast';
import { useConfirm } from '../ConfirmProvider';

interface Props {
  ownerType: 'task' | 'article';
  ownerId: string;
}

const CommentEditor: React.FC<{
  initialJson?: any;
  initialMarkdown?: string;
  onSubmit: (json: any, md: string, pending: AttachmentMeta[]) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}> = ({ initialJson, initialMarkdown, onSubmit, onCancel, submitLabel = 'Отправить' }) => {
  const [json, setJson] = useState<any>(initialJson || null);
  const [md, setMd] = useState<string>(initialMarkdown || '');
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!json && !md.trim() && pending.length === 0) return;
    setBusy(true);
    try { await onSubmit(json, md, pending); } finally { setBusy(false); }
  };

  return (
    <div className="comment-editor">
      <RichTextEditor
        value={json}
        initialMarkdown={!json ? initialMarkdown : undefined}
        onChange={(j, m) => { setJson(j); setMd(m); }}
        placeholder="Комментарий…"
        onUploadFile={async (file) => {
          try { const a = await uploadAttachment(file, {}); return { id: a._id, filename: a.filename, mime: a.mime }; }
          catch { return null; }
        }}
      />
      <AttachmentBlock ownerType="comment" ownerId={null} pendingItems={pending} onPendingChange={setPending} />
      <div className="comment-editor-actions">
        {onCancel && <button type="button" className="button" onClick={onCancel} style={{ backgroundColor: 'var(--color-text-muted)' }}>Отмена</button>}
        <button type="button" className="button" onClick={submit} disabled={busy}>{busy ? '…' : submitLabel}</button>
      </div>
    </div>
  );
};

const CommentNode: React.FC<{
  c: CommentItem;
  replies: CommentItem[];
  onReply: (c: CommentItem) => void;
  onChanged: () => void;
}> = ({ c, replies, onReply, onChanged }) => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [viewer, setViewer] = useState<any | null>(null);

  const saveEdit = async (json: any, md: string) => {
    try { await updateComment(c._id, { contentJson: json, content: md }); setEditing(false); onChanged(); }
    catch { toast('Не удалось сохранить', 'error'); }
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Удалить комментарий?', message: replies.length ? 'Будет показано «удалён» (есть ответы).' : '', confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try { await deleteComment(c._id); onChanged(); } catch { toast('Не удалось удалить', 'error'); }
  };

  return (
    <div className="comment-item">
      <div className="comment-body">
        {c.deleted ? (
          <p className="comment-deleted">Комментарий удалён</p>
        ) : editing ? (
          <CommentEditor initialJson={c.contentJson} initialMarkdown={c.content} onSubmit={saveEdit} onCancel={() => setEditing(false)} submitLabel="Сохранить" />
        ) : (
          <>
            {c.contentJson ? <RichTextRenderer contentJson={c.contentJson} markdown={c.content} className="md-content" /> : <p className="comment-text">{c.content}</p>}
            {c.attachments?.length > 0 && (
              <div className="comment-atts">
                {c.attachments.map((a) => (
                  <button key={a._id} type="button" className="att-chip" onClick={() => setViewer({ _id: a._id, filename: a.filename, mime: a.mime })}>{a.filename}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="comment-meta">
        <span className="comment-date">{new Date(c.createdAt).toLocaleString('ru-RU')}{c.editedAt ? ' · изменён' : ''}</span>
        {!c.deleted && (
          <span className="comment-actions">
            <button type="button" onClick={() => onReply(c)} title="Ответить"><Reply size={14} /></button>
            {!editing && <button type="button" onClick={() => setEditing(true)} title="Редактировать"><Pencil size={14} /></button>}
            <button type="button" onClick={remove} title="Удалить"><Trash2 size={14} /></button>
          </span>
        )}
      </div>
      {viewer && <AttachmentViewer att={viewer} onClose={() => setViewer(null)} />}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => <CommentNode key={r._id} c={r} replies={[]} onReply={onReply} onChanged={onChanged} />)}
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<Props> = ({ ownerType, ownerId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);

  const refresh = () => listComments(ownerType, ownerId).then((c) => { setItems(c); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  const roots = items.filter((c) => !c.parentId);
  const repliesOf = (id: string) => items.filter((c) => c.parentId === id);

  const submit = async (json: any, md: string, pending: AttachmentMeta[]) => {
    try {
      await createComment({ ownerType, ownerId, parentId: replyTo?._id || null, replyToUserId: replyTo?.authorId || null, contentJson: json, content: md, attachments: pending.map((p) => p._id) });
      setReplyTo(null);
      refresh();
    } catch (e: any) { toast(e?.response?.data?.message || 'Не удалось отправить', 'error'); }
  };

  return (
    <div className="comment-section">
      <div className="comment-head"><MessageSquare size={16} /> Комментарии{items.length ? ` (${items.length})` : ''}</div>
      <CommentEditor onSubmit={submit} submitLabel="Отправить" />
      {loading ? <p className="att-empty">Загрузка…</p> : roots.length === 0 ? (
        <p className="att-empty">Нет комментариев</p>
      ) : (
        <div className="comment-list">
          {roots.map((c) => (
            <CommentNode key={c._id} c={c} replies={repliesOf(c._id)} onReply={setReplyTo} onChanged={refresh} />
          ))}
        </div>
      )}
      {replyTo && (
        <div className="comment-reply-box">
          <div className="comment-reply-head">Ответ на комментарий <button type="button" onClick={() => setReplyTo(null)}><X size={14} /></button></div>
          <CommentEditor onSubmit={submit} onCancel={() => setReplyTo(null)} submitLabel="Ответить" />
        </div>
      )}
    </div>
  );
};

export default CommentSection;
