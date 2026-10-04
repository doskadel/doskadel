import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { Check, SkipForward, Undo2 } from 'lucide-react';
import { Occurrence } from '../hooks/useOccurrences';
import { formatDueDate } from '../utils/date';

type Tab = 'pending' | 'closed';

interface Props {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  pending: Occurrence[];
  done: Occurrence[];
  loading: boolean;
  /** действие над вхождением (done/skip/undo) */
  onAct: (originalDate: string, action: 'done' | 'skip' | 'undo') => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ожидает', done: 'Выполнено', skipped: 'Пропущено', missed: 'Пропущено (авто)',
};

const OccurrenceHistoryModal: React.FC<Props> = ({ open, onClose, taskTitle, pending, done, loading, onAct }) => {
  const [tab, setTab] = useState<Tab>('pending');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTab(pending.length > 0 ? 'pending' : 'closed');
  }, [open, pending.length]);

  const run = async (orig: string, action: 'done' | 'skip' | 'undo') => {
    setBusy(true);
    try { await onAct(orig, action); } finally { setBusy(false); }
  };

  const list = tab === 'pending' ? pending : done;

  return (
    <Modal open={open} onClose={onClose} title={`История: ${taskTitle}`} wide>
      <div className="occ-modal">
        <div className="occ-tabs">
          <button type="button" className={`occ-tab ${tab === 'pending' ? 'occ-tab--active' : ''}`} onClick={() => setTab('pending')}>
            Невыполненные ({pending.length})
          </button>
          <button type="button" className={`occ-tab ${tab === 'closed' ? 'occ-tab--active' : ''}`} onClick={() => setTab('closed')}>
            История ({done.length})
          </button>
        </div>

        <div className="occ-list">
          {loading && <p className="occ-empty">Загрузка...</p>}
          {!loading && list.length === 0 && <p className="occ-empty">Пусто</p>}
          {!loading && list.map((occ) => (
            <div key={occ._id} className="occ-row">
              <span className="occ-row-date">{formatDueDate(occ.dueAt)}</span>
              <span className={`occ-row-status occ-row-status--${occ.status}`}>{STATUS_LABEL[occ.status] || occ.status}</span>
              <div className="occ-row-actions">
                {occ.status === 'pending' && (
                  <>
                    <button type="button" className="occ-mini" disabled={busy} onClick={() => run(occ.originalDate, 'done')} title="Выполнено"><Check size={16} /></button>
                    <button type="button" className="occ-mini" disabled={busy} onClick={() => run(occ.originalDate, 'skip')} title="Пропустить"><SkipForward size={16} /></button>
                  </>
                )}
                {(occ.status === 'done' || occ.status === 'skipped') && (
                  <button type="button" className="occ-mini" disabled={busy} onClick={() => run(occ.originalDate, 'undo')} title="Отменить"><Undo2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default OccurrenceHistoryModal;
