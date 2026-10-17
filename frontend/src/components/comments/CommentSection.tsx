import React, { useEffect, useState } from 'react';
import { MessageSquare, Reply, Pencil, Trash2, Send, X } from 'lucide-react';
import { CommentItem, listComments, createComment, updateComment, deleteComment } from '../../utils/comments';
import { uploadAttachment, AttachmentMeta, notifyAttachmentsChanged } from '../../utils/attachments';
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
  ownerType: 'task' | 'article';
  ownerId: string;
  initialJson?: any;
  initialMarkdown?: string;
  onSubmit: (json: any, md: string, pending: AttachmentMeta[]) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}> = ({ ownerType, ownerId, initialJson, initialMarkdown, onSubmit, onCancel, submitLabel = 'Отправить' }) => {
  const [json, setJson] = useState<any>(initialJson || null);
  const [md, setMd] = useState<string>(initialMarkdown || '');
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState(!!initialMarkdown || !!initialJson || !!onCancel);

  const submit = async () => {
    if (!json && !md.trim() && pending.length === 0) return;
    setBusy(true);
    try {
      await onSubmit(json, md, pending);
      setPending([]); setJson(null); setMd('');
      setResetKey((k) => k + 1); // ремоунт редактора -> пустое поле
      if (!onCancel) setExpanded(false); // новый комментарий -> свернуть в строку
    } finally { setBusy(false); }
  };

  if (!expanded) {
    return (
      <button type="button" className="comment-collapsed-input" onClick={() => setExpanded(true)}>
        Написать комментарий…
      </button>
    );
  }

  return (
    <div className="comment-editor">
      <RichTextEditor
        key={resetKey}
        value={json}
        initialMarkdown={!json ? initialMarkdown : undefined}
        onChange={(j, m) => { setJson(j); setMd(m); }}
        placeholder="Комментарий…"
        onUploadFile={async (file) => {
          try {
            // Файл комментария — вложение owner (Jira-style), метка commentId при отправке.
            const a = await uploadAttachment(file, { ownerType, ownerId });
            setPending((prev) => [...prev, a]);
            notifyAttachmentsChanged();
            return { id: a._id, filename: a.filename, mime: a.mime };
          } catch { return null; }
        }}
      />
      {pending.length > 0 && (
        <div className="comment-pending-atts">
          {pending.map((p) => (
            <span key={p._id} className="att-chip">{p.filename}</span>
          ))}
        </div>
      )}
      <div className="comment-editor-actions">
        <button type="button" className="button" onClick={() => { if (onCancel) onCancel(); else setExpanded(false); }} style={{ backgroundColor: 'var(--color-text-muted)' }} disabled={busy}>{onCancel ? 'Отмена' : 'Свернуть'}</button>
        <button type="button" className="button" onClick={submit} disabled={busy}>{busy ? '…' : submitLabel}</button>
      </div>
    </div>
  );
};

const CommentNode: React.FC<{
  c: CommentItem;
  replies: CommentItem[];
  ownerType: 'task' | 'article';
  ownerId: string;
  onReply: (c: CommentItem) => void;
  onChanged: () => void;
}> = ({ c, replies, ownerType, ownerId, onReply, onChanged }) => {
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
          <CommentEditor ownerType={ownerType} ownerId={ownerId} initialJson={c.contentJson} initialMarkdown={c.content} onSubmit={saveEdit} onCancel={() => setEditing(false)} submitLabel="Сохранить" />
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
          {replies.map((r) => <CommentNode key={r._id} c={r} replies={[]} ownerType={ownerType} ownerId={ownerId} onReply={onReply} onChanged={onChanged} />)}
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
      <CommentEditor ownerType={ownerType} ownerId={ownerId} onSubmit={submit} submitLabel="Отправить" />
      {loading ? <p className="att-empty">Загрузка…</p> : roots.length === 0 ? (
        <p className="att-empty">Нет комментариев</p>
      ) : (
        <div className="comment-list">
          {roots.map((c) => (
            <CommentNode key={c._id} c={c} replies={repliesOf(c._id)} ownerType={ownerType} ownerId={ownerId} onReply={setReplyTo} onChanged={refresh} />
          ))}
        </div>
      )}
      {replyTo && (
        <div className="comment-reply-box">
          <div className="comment-reply-head">Ответ на комментарий <button type="button" onClick={() => setReplyTo(null)}><X size={14} /></button></div>
          <CommentEditor ownerType={ownerType} ownerId={ownerId} onSubmit={submit} onCancel={() => setReplyTo(null)} submitLabel="Ответить" />
        </div>
      )}
    </div>
  );
};

export default CommentSection;
