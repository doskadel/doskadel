import { useEffect } from 'react';

interface HotkeyOptions {
  /** ctrl/cmd + K (или другая клавиша из KeyCode) */
  keyCode?: string;
  /** одиночная клавиша, напр. '/' */
  key?: string;
  enabled?: boolean;
  /** не срабатывать, если фокус в поле ввода/textarea/contenteditable */
  skipInInput?: boolean;
  onTrigger: () => void;
}

/**
 * Глобальный хоткей на document.
 * - ctrl/cmd + <KeyCode> (напр. KeyK) — по e.code, работает в любой раскладке;
 * - либо одиночная клавиша (напр. '/'), когда фокус не в поле ввода.
 * preventDefault ставится до вызова onTrigger.
 */
export const useGlobalHotkey = ({ keyCode, key, enabled = true, skipInInput = true, onTrigger }: HotkeyOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      // ctrl/cmd + KeyK
      if (keyCode && (e.ctrlKey || e.metaKey) && e.code === keyCode) {
        e.preventDefault();
        onTrigger();
        return;
      }
      // одиночная клавиша (напр. /)
      if (key && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === key) {
        if (skipInInput && isEditable(e.target)) return;
        e.preventDefault();
        onTrigger();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [keyCode, key, enabled, skipInInput, onTrigger]);
};
