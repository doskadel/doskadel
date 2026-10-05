import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
  onUndo?: () => void;
}

interface ToastCtx {
  toast: (text: string, kind?: ToastKind, opts?: { onUndo?: () => void }) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export const useToast = () => useContext(Ctx);

let seq = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((text: string, kind: ToastKind = 'info', opts?: { onUndo?: () => void }) => {
    const id = ++seq;
    setItems((cur) => [...cur, { id, kind, text, onUndo: opts?.onUndo }]);
    setTimeout(() => remove(id), opts?.onUndo ? 6000 : 3500);
  }, [remove]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Уведомления">
        {items.map((t) => (
          <div key={t.id} className={'toast toast--' + t.kind} role="status">
            <span className="toast-icon">
              {t.kind === 'success' ? <CheckCircle2 size={18} /> : t.kind === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
            </span>
            <span className="toast-text">{t.text}</span>
            {t.onUndo && (
              <button
                type="button"
                className="toast-undo"
                onClick={() => { t.onUndo?.(); remove(t.id); }}
              >
                Отменить
              </button>
            )}
            <button type="button" className="toast-close" onClick={() => remove(t.id)} aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};
