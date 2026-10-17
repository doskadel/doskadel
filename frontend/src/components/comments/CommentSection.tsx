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

/** Пустой ли TipTap-документ (нет текста и нет нетекстовых узлов). */
const isJsonEmpty = (json: any): boolean => {
  if (!json) return true;
  if (typeof json === 'string') return !json.trim();
  const content = json.content;
  if (!Array.isArray(content) || content.length === 0) return true;
  const hasReal = (nodes: any[]): boolean => nodes.some((n) => {
    if (!n) return false;
    if (n.type === 'text') return !!(n.text || '').trim();
    if (n.type === 'image' || n.type === 'attachmentChip') return true;
    if (Array.isArray(n.content)) return hasReal(n.content);
    return false;
  });
  return !hasReal(content);
};


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
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!expanded) return;
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && rootRef.current.contains(e.target as Node)) return;
      const empty = !md.trim() && isJsonEmpty(json) && pending.length === 0;
      if (empty && !onCancel) setExpanded(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [expanded, md, json, pending, onCancel]);

  const submit = async () => {
    if (isJsonEmpty(json) && !md.trim() && pending.length === 0) return;
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
    <div className="comment-editor" ref={rootRef}>
      <RichTextEditor
        key={resetKey}
        minimal
        autoFocus
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
        {onCancel && <button type="button" className="button" onClick={onCancel} style={{ backgroundColor: 'var(--color-text-muted)' }} disabled={busy}>Отмена</button>}
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
  childrenOf: (id: string) => CommentItem[];
  submitReply: (c: CommentItem, json: any, md: string, pending: AttachmentMeta[]) => Promise<void>;
  depth?: number;
}> = ({ c, replies, ownerType, ownerId, onReply, onChanged, childrenOf, submitReply, depth = 1 }) => { const canReply = depth < 3;
  const { toast } = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
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
      <div className="comment-meta">
        {c.authorEmail && (
          <span className="comment-author">
            <span className="comment-avatar">{c.authorAvatar ? <img src={c.authorAvatar} alt="" /> : (c.authorEmail[0] || '?').toUpperCase()}</span>
            {c.authorEmail}
          </span>
        )}
        <span className="comment-date">{new Date(c.createdAt).toLocaleString('ru-RU')}{c.editedAt ? ' · изменён' : ''}</span>
      </div>
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
      {!c.deleted && (
        <div className="comment-actions comment-actions--bottom">
          {canReply && <button type="button" onClick={() => setReplying((v) => !v)} title="Ответить"><Reply size={14} /></button>}
          {!editing && <button type="button" onClick={() => setEditing(true)} title="Редактировать"><Pencil size={14} /></button>}
          <button type="button" onClick={remove} title="Удалить"><Trash2 size={14} /></button>
        </div>
      )}
      {viewer && <AttachmentViewer att={viewer} onClose={() => setViewer(null)} />}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((r) => <CommentNode key={r._id} c={r} replies={childrenOf(r._id)} ownerType={ownerType} ownerId={ownerId} onReply={onReply} onChanged={onChanged} childrenOf={childrenOf} submitReply={submitReply} depth={depth + 1} />)}
        </div>
      )}
      {replying && !c.deleted && (
        <div className="comment-reply-inline">
          <CommentEditor ownerType={ownerType} ownerId={ownerId} onSubmit={async (json, md, pending) => { await submitReply(c, json, md, pending); setReplying(false); }} onCancel={() => setReplying(false)} submitLabel="Ответить" />
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<Props> = ({ ownerType, ownerId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);


  const refresh = () => listComments(ownerType, ownerId).then((c) => { setItems(c); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  const roots = items.filter((c) => !c.parentId);
  const childrenOf = (id: string) => items.filter((c) => c.parentId === id);

  const submit = async (json: any, md: string, pending: AttachmentMeta[]) => {
    try {
      await createComment({ ownerType, ownerId, parentId: null, contentJson: json, content: md, attachments: pending.map((p) => p._id) });
      refresh();
    } catch (e: any) { toast(e?.response?.data?.message || 'Не удалось отправить', 'error'); }
  };

  const submitReply = async (parent: CommentItem, json: any, md: string, pending: AttachmentMeta[]) => {
    try {
      await createComment({ ownerType, ownerId, parentId: parent._id, replyToUserId: parent.authorId, contentJson: json, content: md, attachments: pending.map((p) => p._id) });
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
            <CommentNode key={c._id} c={c} replies={childrenOf(c._id)} ownerType={ownerType} ownerId={ownerId} onReply={() => {}} onChanged={refresh} childrenOf={childrenOf} submitReply={submitReply} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
