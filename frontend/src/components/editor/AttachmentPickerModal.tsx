import React from 'react';
import Modal from '../Modal';
import { FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { AttachmentMeta, useAttachmentUrl, formatBytes } from '../../utils/attachments';

interface Props {
  open: boolean;
  title: string;
  items: AttachmentMeta[];
  imagesOnly?: boolean;
  onClose: () => void;
  onPick: (att: AttachmentMeta) => void;
  onUploadNew: () => void;
}

const Thumb: React.FC<{ att: AttachmentMeta }> = ({ att }) => {
  const { url } = useAttachmentUrl(att.mime.startsWith('image/') ? att._id : null);
  if (att.mime.startsWith('image/') && url) return <img src={url} alt="" className="att-pick-thumb" />;
  return <span className="att-pick-icon">{att.mime.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}</span>;
};

/** Выбор вложения из блока файлов (для вставки в текст). */
const AttachmentPickerModal: React.FC<Props> = ({ open, title, items, imagesOnly, onClose, onPick, onUploadNew }) => {
  const list = imagesOnly ? items.filter((a) => a.mime.startsWith('image/')) : items;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="att-picker">
        <button type="button" className="att-picker-upload" onClick={onUploadNew}>
          <Paperclip size={16} /> Загрузить новый файл
        </button>
        {list.length === 0 ? (
          <p className="att-empty">Нет подходящих файлов в блоке вложений</p>
        ) : (
          <div className="att-picker-list">
            {list.map((a) => (
              <button key={a._id} type="button" className="att-picker-item" onClick={() => onPick(a)} title={a.filename}>
                <Thumb att={a} />
                <span className="att-picker-meta">
                  <span className="att-picker-name">{a.filename}</span>
                  <span className="att-picker-sub">{formatBytes(a.size)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AttachmentPickerModal;
