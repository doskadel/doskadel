import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Trash2, FileText, FileArchive, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Download } from 'lucide-react';
import {
  AttachmentMeta, listAttachments, uploadAttachment, deleteAttachment, useAttachmentUrl, formatBytes, getAttachmentsConfig, AttachmentConfig, onAttachmentsChanged,
} from '../../utils/attachments';
import { useToast } from '../Toast';
import { useConfirm } from '../ConfirmProvider';
import AttachmentViewer from './AttachmentViewer';

interface Props {
  ownerType: 'article' | 'task' | 'comment';
  ownerId: string | null; // null -> pending-загрузка (черновик)
  pendingItems?: AttachmentMeta[]; // загруженные до создания сущности (объекты)
  onPendingChange?: (items: AttachmentMeta[]) => void;
  onUploaded?: (att: AttachmentMeta) => void; // для вставки в текст
  onDeleted?: (att: AttachmentMeta) => void; // удалить ссылки из текста
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

const AttachmentBlock: React.FC<Props> = ({ ownerType, ownerId, pendingItems = [], onPendingChange, onUploaded, onDeleted, readOnly }) => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<AttachmentMeta[]>([]);
  // В pending-режиме источник — pendingItems из родителя (могут добавляться из редактора).
  const pending = ownerId ? [] : pendingItems;
  const setPending = (updater: AttachmentMeta[] | ((prev: AttachmentMeta[]) => AttachmentMeta[])) => {
    const next = typeof updater === 'function' ? (updater as any)(pendingItems) : updater;
    onPendingChange?.(next);
  };
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<AttachmentConfig | null>(null);
  const [viewer, setViewer] = useState<AttachmentMeta | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getAttachmentsConfig().then(setConfig).catch(() => {}); }, []);

  const refresh = () => {
    if (!ownerId) return;
    listAttachments(ownerType, ownerId).then(setItems).catch(() => {});
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ownerType, ownerId]);

  // Обновление, когда вложение загружено из редактора (onUploadFile) и т.п.
  useEffect(() => {
    const unsub = onAttachmentsChanged(() => refresh());
    return () => { unsub(); };
  }, [ownerType, ownerId]);

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
        else { setPending((prev) => [...prev, att]); }
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
      else { setPending((prev) => prev.filter((a) => a._id !== att._id)); }
      onDeleted?.(att);
      toast('Файл удалён', 'success');
    } catch { toast('Не удалось удалить файл', 'error'); }
  };

  const list = ownerId ? items : pending;
  const accept = config ? config.allowedMime.join(',') : undefined;

  const onDropFiles = (e: React.DragEvent) => {
    if (readOnly) return;
    const files = e.dataTransfer?.files;
    if (files && files.length) { e.preventDefault(); doUpload(files); }
    setDragOver(false);
  };

  return (
    <div
      className={'att-block' + (dragOver ? ' att-block--dragover' : '')}
      onDragOver={readOnly ? undefined : (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={readOnly ? undefined : (e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={onDropFiles}
    >
      {!readOnly && (
        <button type="button" className="att-dropzone" onClick={() => inputRef.current?.click()} disabled={uploading}>
          Перетащите файлы сюда или нажмите, чтобы выбрать
        </button>
      )}
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
            <li
              key={att._id}
              className="att-item"
              onClick={() => setViewer(att)}
              title={`Открыть ${att.filename}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-attachment', JSON.stringify({ id: att._id, filename: att.filename, mime: att.mime }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {isImage(att.mime) ? <AttachmentThumb att={att} onOpen={() => setViewer(att)} /> : <span className="att-icon">{fileIcon(att.mime)}</span>}
              <div className="att-meta">
                <span className="att-name" title={att.filename}>{att.filename}</span>
                <span className="att-sub">{att.mime.split('/')[1]?.toUpperCase() || att.mime} · {formatBytes(att.size)}</span>
              </div>
              {!readOnly && (
                <button type="button" className="att-del" onClick={(e) => { e.stopPropagation(); remove(att); }} title="Удалить"><Trash2 size={15} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewer && <AttachmentViewer att={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

export default AttachmentBlock;
