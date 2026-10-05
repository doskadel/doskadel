import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { isPushSupported, getNotificationPermission, subscribeUser } from '../utils/push';

const SEEN_KEY = 'doskadel_push_prompt_seen';

/**
 * Одноразовый запрос разрешения на уведомления при первом входе.
 * Показывается, если: push поддерживается, разрешение ещё не выдано (default),
 * и пользователь ещё не отвечал на наш промпт.
 */
const PushPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isPushSupported()) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    if (getNotificationPermission() !== 'default') return;
    // небольшая задержка, чтобы не мешать первому рендеру
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    const res = await subscribeUser();
    setBusy(false);
    if (res.ok) {
      localStorage.setItem(SEEN_KEY, '1');
      setVisible(false);
    } else {
      setMsg(res.message || 'Не удалось включить');
    }
  };

  if (!visible) return null;

  return (
    <div className="push-prompt" role="dialog" aria-label="Уведомления">
      <span className="push-prompt-icon"><Bell size={20} /></span>
      <div className="push-prompt-body">
        <p className="push-prompt-title">Включить уведомления?</p>
        <p className="push-prompt-text">
          {msg || 'Напоминания о задачах на этом устройстве.'}
        </p>
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="button button--sm" onClick={enable} disabled={busy}>
          {busy ? '...' : 'Включить'}
        </button>
        <button type="button" className="push-prompt-skip" onClick={dismiss}>Позже</button>
      </div>
      <button type="button" className="push-prompt-close" onClick={dismiss} aria-label="Закрыть">
        <X size={16} />
      </button>
    </div>
  );
};

export default PushPrompt;
