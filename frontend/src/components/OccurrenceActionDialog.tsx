import React, { useState } from 'react';
import { Check, SkipForward, CalendarClock, Square } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import type { OccurrenceAction, OccurrenceScope } from '../hooks/useOccurrences';

interface Props {
  open: boolean;
  onClose: () => void;
  taskId: string;
  originalDate: string;
  /** выполнить действие; для move нужен dueAt и scope */
  onAct: (p: { action: OccurrenceAction; dueAt?: string; scope?: OccurrenceScope }) => Promise<void>;
  onCompleteSeries: () => Promise<void>;
  /** показывать ли 'Завершить повторение' (бессрочная серия) */
  canComplete?: boolean;
}

const OccurrenceActionDialog: React.FC<Props> = ({ open, onClose, originalDate, onAct, onCompleteSeries, canComplete }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [scope, setScope] = useState<OccurrenceScope>('this');

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(okMsg, 'success');
      onClose();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Ошибка', 'error');
    } finally {
      setBusy(false);
    }
  };

  const doMove = () => {
    if (!newDate) return;
    const iso = new Date(newDate).toISOString();
    run(() => onAct({ action: 'move', dueAt: iso, scope }), 'Перенесено');
  };

  return (
    <Modal open={open} onClose={onClose} title="Действие">
      {!moveMode ? (
        <div className="occ-actions">
          <button type="button" className="occ-action-btn" disabled={busy} onClick={() => run(() => onAct({ action: 'done' }), 'Выполнено')}>
            <Check size={18} /> Выполнено
          </button>
          <button type="button" className="occ-action-btn" disabled={busy} onClick={() => run(() => onAct({ action: 'skip' }), 'Пропущено')}>
            <SkipForward size={18} /> Пропустить
          </button>
          <button type="button" className="occ-action-btn" disabled={busy} onClick={() => setMoveMode(true)}>
            <CalendarClock size={18} /> Перенести
          </button>
          {canComplete && (
            <button type="button" className="occ-action-btn occ-action-btn--danger" disabled={busy} onClick={() => run(onCompleteSeries, 'Серия завершена')}>
              <Square size={18} /> Завершить повторение
            </button>
          )}
        </div>
      ) : (
        <div className="occ-move">
          <label className="occ-label">Новая дата и время</label>
          <input type="datetime-local" className="occ-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <label className="occ-label">Применить</label>
          <div className="occ-scope">
            {(['this', 'following', 'all'] as OccurrenceScope[]).map((s) => (
              <button
                key={s}
                type="button"
                className={'occ-scope-btn' + (scope === s ? ' occ-scope-btn--active' : '')}
                onClick={() => setScope(s)}
              >
                {s === 'this' ? 'Только это' : s === 'following' ? 'Это и следующие' : 'Все'}
              </button>
            ))}
          </div>
          <div className="occ-move-actions">
            <button type="button" className="occ-action-btn occ-action-btn--ghost" disabled={busy} onClick={() => setMoveMode(false)}>Назад</button>
            <button type="button" className="occ-action-btn" disabled={busy || !newDate} onClick={doMove}>Перенести</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default OccurrenceActionDialog;
