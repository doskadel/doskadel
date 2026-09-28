import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import ConfirmDialog, { ConfirmDialogProps } from './ConfirmDialog';

type ConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onClose' | 'loading'>;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface ConfirmProviderProps {
  children: ReactNode;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: 'Подтвердить действие?',
};

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: DEFAULT_OPTIONS,
    resolve: null,
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        options: { ...DEFAULT_OPTIONS, ...options },
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, []);

  const handleClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.options.title}
        message={state.options.message}
        confirmLabel={state.options.confirmLabel}
        cancelLabel={state.options.cancelLabel}
        danger={state.options.danger}
        icon={state.options.icon}
        hideCancel={state.options.hideCancel}
        extraActions={state.options.extraActions}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextValue['confirm'] => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }
  return ctx.confirm;
};