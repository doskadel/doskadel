import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Check, SkipForward, Undo2 } from 'lucide-react';
import api from '../utils/api';
import { Occurrence } from '../hooks/useOccurrences';
import { formatDueDate } from '../utils/date';

type Tab = 'upcoming' | 'history';

interface Props {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  pending: Occurrence[];
  done: Occurrence[];
  loading: boolean;
  onAct: (originalDate: string, action: 'done' | 'skip' | 'undo') => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Выполнено', skipped: 'Пропущено', missed: 'Пропущено (авто)', pending: 'Ожидает',
};

const OccurrenceHistoryModal: React.FC<Props> = ({ open, onClose, taskId, taskTitle, pending, done, loading, onAct }) => {
  const [tab, setTab] = useState<Tab>('history');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Occurrence[]>([]);
  const [counts, setCounts] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [showAll, setShowAll] = useState(false);
  const [upcoming, setUpcoming] = useState<Array<{ taskId: string; title: string; dueAt: string; originalDate: string }>>([]);

  useEffect(() => {
    if (!open) return;
    api.get(`/api/occurrences/history/${taskId}`).then((r) => {
      setHistory(r.data.occurrences || []);
      setCounts({ done: r.data.done || 0, total: r.data.total || 0 });
      setUpcoming(r.data.upcoming || []);
    }).catch(() => {});
  }, [open, taskId, pending, done]);

  const run = async (orig: string, action: 'done' | 'skip' | 'undo') => {
    setBusy(true);
    try { await onAct(orig, action); } finally { setBusy(false); }
  };

  // Предстоящие: вычисленные будущие вхождения серии (с бэка), ближайшие 10
  const upcomingShown = showAll ? upcoming : upcoming.slice(0, 10);
  // История: done/skipped/missed, от новых
  const historyList = history.filter((o) => o.status !== 'pending');

  return (
    <Modal open={open} onClose={onClose} title={`История: ${taskTitle}`} wide>
      <div className="occ-modal">
        {counts.total > 0 && (
          <p className="occ-summary">Выполнено {counts.done} из {counts.total}</p>
        )}
        <div className="occ-tabs">
          <button type="button" className={`occ-tab ${tab === 'history' ? 'occ-tab--active' : ''}`} onClick={() => setTab('history')}>
            История ({historyList.length})
          </button>
          <button type="button" className={`occ-tab ${tab === 'upcoming' ? 'occ-tab--active' : ''}`} onClick={() => setTab('upcoming')}>
            Предстоящие ({upcoming.length})
          </button>
        </div>

        <div className="occ-list">
          {loading && tab === 'upcoming' && <p className="occ-empty">Загрузка...</p>}

          {tab === 'upcoming' && (
            <>
              {!loading && upcoming.length === 0 && <p className="occ-empty">Нет предстоящих</p>}
              {upcomingShown.map((occ) => (
                <div key={occ.originalDate} className="occ-row">
                  <span className="occ-row-date">{formatDueDate(occ.dueAt)}</span>
                  <div className="occ-row-actions">
                    <button type="button" className="occ-icon-btn" disabled={busy} onClick={() => run(occ.originalDate, 'done')} title="Выполнено" aria-label="Выполнено"><Check size={16} /></button>
                    <button type="button" className="occ-icon-btn" disabled={busy} onClick={() => run(occ.originalDate, 'skip')} title="Пропустить" aria-label="Пропустить"><SkipForward size={16} /></button>
                  </div>
                </div>
              ))}
              {!showAll && upcoming.length > 10 && (
                <button type="button" className="occ-more" onClick={() => setShowAll(true)}>Показать ещё ({upcoming.length - 10})</button>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {historyList.length === 0 && <p className="occ-empty">Пока пусто</p>}
              {historyList.map((occ) => (
                <div key={occ._id} className="occ-row">
                  <span className="occ-row-date">{formatDueDate(occ.dueAt)}</span>
                  <span className={`occ-badge occ-badge--${occ.status}`}>{STATUS_LABEL[occ.status] || occ.status}</span>
                  <div className="occ-row-actions">
                    <button type="button" className="occ-icon-btn" disabled={busy} onClick={() => run(occ.originalDate, 'undo')} title="Отменить" aria-label="Отменить"><Undo2 size={16} /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OccurrenceHistoryModal;
