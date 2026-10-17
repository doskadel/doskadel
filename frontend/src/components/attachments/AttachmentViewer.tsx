import React, { useEffect, useRef, useState } from 'react';
import { AttachmentMeta, useAttachmentUrl } from '../../utils/attachments';

export const isImageMime = (mime: string) => mime.startsWith('image/');
export const isPdfMime = (mime: string) => mime === 'application/pdf';
export const isTextMime = (mime: string) => mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml';

/** Универсальный просмотр вложения: картинки (zoom/pan), pdf (iframe), текст (pre), прочее (скачать). */
const AttachmentViewer: React.FC<{ att: Pick<AttachmentMeta, '_id' | 'filename' | 'mime'>; onClose: () => void }> = ({ att, onClose }) => {
  const { url, loading, error } = useAttachmentUrl(att._id);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [text, setText] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const textLike = isTextMime(att.mime);
  useEffect(() => {
    if (!url || !textLike) return;
    let active = true;
    fetch(url).then((r) => r.text()).then((t) => { if (active) setText(t.slice(0, 200000)); }).catch(() => {});
    return () => { active = false; };
  }, [url, textLike]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = att.filename || 'file'; document.body.appendChild(a); a.click(); a.remove();
  };

  const renderBody = () => {
    if (loading) return <span className="att-viewer-hint">Загрузка…</span>;
    if (error) return <span className="att-viewer-hint">Не удалось загрузить</span>;
    if (!url) return null;
    if (isImageMime(att.mime)) {
      return (
        <img
          src={url}
          alt={att.filename}
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'default' }}
          onWheel={(e) => { e.preventDefault(); setScale((s) => Math.min(5, Math.max(0.5, s + (e.deltaY < 0 ? 0.2 : -0.2)))); }}
          onPointerDown={(e) => { if (scale <= 1) return; drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (!drag.current) return; setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); }}
          onPointerUp={() => { drag.current = null; }}
        />
      );
    }
    if (isPdfMime(att.mime)) return <iframe title={att.filename} src={url} className="att-viewer-pdf" />;
    if (textLike) return <pre className="att-viewer-text">{text ?? 'Загрузка…'}</pre>;
    return (
      <div className="att-viewer-fallback">
        <p>Предпросмотр для этого типа недоступен.</p>
        <button type="button" className="button" onClick={download}>Скачать {att.filename}</button>
      </div>
    );
  };

  return (
    <div className="att-viewer" onClick={onClose}>
      <button type="button" className="att-viewer-close" onClick={onClose} aria-label="Закрыть">×</button>
      <div className="att-viewer-head" onClick={(e) => e.stopPropagation()}>
        <span className="att-viewer-title">{att.filename}</span>
        <button type="button" className="att-viewer-dl" onClick={download} title="Скачать">Скачать</button>
      </div>
      <div className="att-viewer-stage" onClick={(e) => e.stopPropagation()}>
        {renderBody()}
      </div>
      {isImageMime(att.mime) && (
        <div className="att-viewer-tools" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}>100%</button>
        </div>
      )}
    </div>
  );
};

export default AttachmentViewer;
