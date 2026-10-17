import React, { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useToast } from './Toast';

interface Props {
  avatar?: string | null;
  initials: string;
  onChanged: (url: string | null) => void;
}

const SIZE = 256;

/** Загрузка аватара с кропом по центру в квадрат (canvas), сохранение dataURL. */
const AvatarUploader: React.FC<Props> = ({ avatar, initials, onChanged }) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const cropSquare = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result as string; };
    reader.onerror = reject;
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no ctx'));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });

  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast('Файл больше 8 МБ', 'error'); return; }
    setBusy(true);
    try {
      const dataUrl = await cropSquare(file);
      await api.put('/api/users/avatar', { avatar: dataUrl });
      onChanged(dataUrl);
      toast('Аватар обновлён', 'success');
    } catch { toast('Не удалось обновить аватар', 'error'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.put('/api/users/avatar', { avatar: '' });
      onChanged(null);
      toast('Аватар удалён', 'success');
    } catch { toast('Не удалось удалить аватар', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="avatar-uploader">
      <div className="avatar-preview">
        {avatar ? <img src={avatar} alt="avatar" /> : <span>{initials}</span>}
      </div>
      <div className="avatar-actions">
        <button type="button" className="avatar-btn" onClick={() => inputRef.current?.click()} disabled={busy} title="Загрузить"><Camera size={16} /></button>
        {avatar && <button type="button" className="avatar-btn avatar-btn--danger" onClick={remove} disabled={busy} title="Удалить"><Trash2 size={16} /></button>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ''; }}
      />
    </div>
  );
};

export default AvatarUploader;
