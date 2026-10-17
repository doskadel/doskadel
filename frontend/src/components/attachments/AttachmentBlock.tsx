import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Trash2, FileText, FileArchive, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Download } from 'lucide-react';
import {
  AttachmentMeta, listAttachments, uploadAttachment, deleteAttachment, useAttachmentUrl, formatBytes, getAttachmentsConfig, AttachmentConfig,
} from '../../utils/attachments';
import { useToast } from '../Toast';
import { useConfirm } from '../ConfirmProvider';

interface Props {
  ownerType: 'article' | 'task';
  ownerId: string | null; // null -> pending-загрузка (черновик)
  pendingIds: string[]; // загруженные до создания сущности
  onPendingChange: (ids: string[]) => void;
  onUploaded?: (att: AttachmentMeta) => void; // для вставки в текст
  readOnly?: boolean;
}

const isImage = (mime: string) => mime.startsWith('image/');

const fileIcon = (mime: string) => {
  if (isImage(mime)) return <ImageIcon size={18} />;
  if (mime === 'application/pdf') return <FileText size={18} />;
  if (mime.includes('zip')) return <FileArchive size={18} />;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet size={18} />;
  if (mime.startsWith('text/')) return <FileText size={18} />;
  return <FileIcon size={18} />;
};

const AttachmentThumb: React.FC<{ att: AttachmentMeta; onOpen: (id: string) => void }> = ({ att, onOpen }) => {
  const { url, loading, error } = useAttachmentUrl(att._id);
  if (isImage(att.mime)) {
    return (
      <button type="button" className="att-thumb" onClick={() => url && onOpen(att._id)} title={att.filename}>
        {url ? <img src={url} alt={att.filename} /> : (
          <span className="att-thumb-ph">{loading ? '…' : (error ? '!' : '')}</span>
        )}
      </button>
    );
  }
  return null;
};

const AttachmentBlock: React.FC<Props> = ({ ownerType, ownerId, pendingIds, onPendingChange, onUploaded, readOnly }) => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<AttachmentMeta[]>([]);
  const [pending, setPending] = useState<AttachmentMeta[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<AttachmentConfig | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getAttachmentsConfig().then(setConfig).catch(() => {}); }, []);

  const refresh = () => {
    if (!ownerId) return;
    listAttachments(ownerType, ownerId).then(setItems).catch(() => {});
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  // Синхронизация pending-списка (только что загруженные до создания)
  useEffect(() => {
    if (ownerId) return;
    // при отсутствии ownerId показываем pending, загруженные в этой сессии
    setPending((prev) => prev);
  }, [ownerId]);

  const doUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    for (const file of arr) {
      const key = file.name + file.size;
      if (config && file.size > config.maxFileBytes) {
        toast(`Файл «${file.name}» больше ${formatBytes(config.maxFileBytes)}`, 'error');
        continue;
      }
      try {
        setProgress((p) => ({ ...p, [key]: 0 }));
        const att = await uploadAttachment(
          file,
          ownerId ? { ownerType, ownerId } : {},
          (pct) => setProgress((p) => ({ ...p, [key]: pct }))
        );
        setProgress((p) => { const c = { ...p }; delete c[key]; return c; });
        if (ownerId) setItems((prev) => [...prev, att]);
        else { setPending((prev) => [...prev, att]); onPendingChange([...pendingIds, att._id]); }
        onUploaded?.(att);
      } catch (err: any) {
        setProgress((p) => { const c = { ...p }; delete c[key]; return c; });
        const status = err?.response?.status;
        const msg = status === 413 ? 'Файл слишком большой' : status === 415 ? 'Тип файла не разрешён' : (err?.response?.data?.message || 'Ошибка загрузки');
        toast(`${file.name}: ${msg}`, 'error');
      }
    }
    setUploading(false);
  };

  const remove = async (att: AttachmentMeta) => {
    const ok = await confirm({ title: 'Удалить файл?', message: att.filename, confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await deleteAttachment(att._id);
      if (ownerId) setItems((prev) => prev.filter((a) => a._id !== att._id));
      else { setPending((prev) => prev.filter((a) => a._id !== att._id)); onPendingChange(pendingIds.filter((id) => id !== att._id)); }
      toast('Файл удалён', 'success');
    } catch { toast('Не удалось удалить файл', 'error'); }
  };

  const list = ownerId ? items : pending;
  const accept = config ? config.allowedMime.join(',') : undefined;

  return (
    <div className="att-block">
      <div className="att-block-head">
        <span className="att-block-title"><Paperclip size={16} /> Вложения</span>
        {!readOnly && (
          <button type="button" className="att-add-btn" onClick={() => inputRef.current?.click()} disabled={uploading}>
            Прикрепить
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) doUpload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {Object.entries(progress).map(([k, pct]) => (
        <div key={k} className="att-progress"><div className="att-progress-bar" style={{ width: `${pct}%` }} /><span>{pct}%</span></div>
      ))}

      {list.length === 0 && !uploading ? (
        <p className="att-empty">Нет вложений</p>
      ) : (
        <ul className="att-list">
          {list.map((att) => (
            <li key={att._id} className="att-item">
              {isImage(att.mime) ? <AttachmentThumb att={att} onOpen={setViewer} /> : <span className="att-icon">{fileIcon(att.mime)}</span>}
              <div className="att-meta">
                <span className="att-name" title={att.filename}>{att.filename}</span>
                <span className="att-sub">{att.mime.split('/')[1]?.toUpperCase() || att.mime} · {formatBytes(att.size)}</span>
              </div>
              {!readOnly && (
                <button type="button" className="att-del" onClick={() => remove(att)} title="Удалить"><Trash2 size={15} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewer && <ImageViewer id={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

// Простой просмотр картинки с zoom/pan
export const ImageViewer: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { url, loading, error } = useAttachmentUrl(id);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="att-viewer" onClick={onClose}>
      <button type="button" className="att-viewer-close" onClick={onClose} aria-label="Закрыть">×</button>
      <div className="att-viewer-stage" onClick={(e) => e.stopPropagation()}>
        {loading && <span className="att-viewer-hint">Загрузка…</span>}
        {error && <span className="att-viewer-hint">Не удалось загрузить</span>}
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'default' }}
            onWheel={(e) => { e.preventDefault(); setScale((s) => Math.min(5, Math.max(0.5, s + (e.deltaY < 0 ? 0.2 : -0.2)))); }}
            onPointerDown={(e) => { if (scale <= 1) return; drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (!drag.current) return; setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); }}
            onPointerUp={() => { drag.current = null; }}
          />
        )}
      </div>
      <div className="att-viewer-tools" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}>100%</button>
      </div>
    </div>
  );
};

export default AttachmentBlock;
