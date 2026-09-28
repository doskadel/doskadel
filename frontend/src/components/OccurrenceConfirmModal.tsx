import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { Occurrence } from '../hooks/useOccurrences';
import { formatDueDate } from '../utils/date';

type Tab = 'pending' | 'done';

interface OccurrenceConfirmModalProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  // pending — уже отфильтрованный список (только dueAt <= now)
  pending: Occurrence[];
  done: Occurrence[];
  loading: boolean;
  onConfirm: (ids: string[]) => Promise<void>;
  onUnconfirm: (ids: string[]) => Promise<void>;
}

const OccurrenceConfirmModal: React.FC<OccurrenceConfirmModalProps> = ({
  open,
  onClose,
  taskTitle,
  pending,
  done,
  loading,
  onConfirm,
  onUnconfirm,
}) => {
  const [tab, setTab] = useState<Tab>('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingSelected, setPendingSelected] = useState<Set<string>>(new Set());
  const [doneSelected, setDoneSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(pending.length > 0 ? 'pending' : 'done');
      setPendingSelected(new Set(pending.map((o) => o._id)));
      setDoneSelected(new Set());
      setDateFrom('');
      setDateTo('');
    }
  }, [open]);

  const filteredPending = useMemo(() => {
    return filterByDate(pending, dateFrom, dateTo);
  }, [pending, dateFrom, dateTo]);

  const filteredDone = useMemo(() => {
    return filterByDate(done, dateFrom, dateTo);
  }, [done, dateFrom, dateTo]);

  const currentList = tab === 'pending' ? filteredPending : filteredDone;
  const currentSelected = tab === 'pending' ? pendingSelected : doneSelected;
  const setCurrentSelected = tab === 'pending' ? setPendingSelected : setDoneSelected;

  const toggleOne = (id: string) => {
    const next = new Set(currentSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCurrentSelected(next);
  };

  const allSelected = currentList.length > 0 && currentList.every((o) => currentSelected.has(o._id));
  const toggleAll = () => {
    if (allSelected) {
      setCurrentSelected(new Set());
    } else {
      setCurrentSelected(new Set(currentList.map((o) => o._id)));
    }
  };

  const handleConfirm = async () => {
    if (pendingSelected.size === 0) return;
    setSaving(true);
    try {
      await onConfirm(Array.from(pendingSelected));
      setPendingSelected(new Set());
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnconfirm = async () => {
    if (doneSelected.size === 0) return;
    setSaving(true);
    try {
      await onUnconfirm(Array.from(doneSelected));
      setDoneSelected(new Set());
    } catch (err) {
      console.error('Unconfirm error:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <Modal open={open} onClose={onClose} title={`Подтверждения: ${taskTitle}`} wide>
      <div className="occ-modal">
        <div className="occ-tabs">
          <button
            type="button"
            className={`occ-tab ${tab === 'pending' ? 'occ-tab--active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Не подтверждённые ({pending.length})
            {pending.length > 0 && <span className="occ-tab-badge" />}
          </button>
          <button
            type="button"
            className={`occ-tab ${tab === 'done' ? 'occ-tab--active' : ''}`}
            onClick={() => setTab('done')}
          >
            Подтверждённые ({done.length})
          </button>
        </div>

        <div className="occ-filter">
          <span className="occ-filter-label">С:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            className="occ-filter-input"
          />
          <span className="occ-filter-label">По:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="occ-filter-input"
          />
          {hasDateFilter && (
            <button
              type="button"
              className="occ-filter-reset"
              onClick={resetDateFilter}
              title="Сбросить даты"
            >
              Сбросить
            </button>
          )}
        </div>

        {tab === 'pending' && (
          <div className="occ-action-bar">
            <label className="occ-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span>Выбрать все</span>
            </label>
            <button
              type="button"
              className="button"
              disabled={pendingSelected.size === 0 || saving}
              onClick={handleConfirm}
            >
              {saving ? '...' : `Подтвердить (${pendingSelected.size})`}
            </button>
          </div>
        )}

        {tab === 'done' && (
          <div className="occ-action-bar">
            <label className="occ-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span>Выбрать все</span>
            </label>
            <button
              type="button"
              className="button button--danger"
              disabled={doneSelected.size === 0 || saving}
              onClick={handleUnconfirm}
            >
              {saving ? '...' : `Отменить (${doneSelected.size})`}
            </button>
          </div>
        )}

        <div className="occ-list">
          {loading && <p className="occ-empty">Загрузка...</p>}

          {!loading && currentList.length === 0 && (
            <p className="occ-empty">
              {tab === 'pending'
                ? (hasDateFilter ? 'Нет записей по фильтру' : 'Нет неподтверждённых')
                : (hasDateFilter ? 'Нет записей по фильтру' : 'Пока нет подтверждённых')}
            </p>
          )}

          {!loading && currentList.map((occ) => {
            const isSelected = currentSelected.has(occ._id);
            return (
              <label key={occ._id} className="occ-row">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(occ._id)}
                />
                <span className="occ-row-status">
                  {tab === 'pending' ? '⏳' : '✅'}
                </span>
                <span className="occ-row-date">
                  {formatDueDate(occ.dueAt)}
                </span>
                {tab === 'done' && occ.confirmedAt && (
                  <span className="occ-row-confirmed">
                    подтверждено {formatDueDate(occ.confirmedAt)}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

const filterByDate = (list: Occurrence[], from: string, to: string): Occurrence[] => {
  if (!from && !to) return list;
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  return list.filter((o) => {
    const t = new Date(o.dueAt).getTime();
    if (fromTime !== null && t < fromTime) return false;
    if (toTime !== null && t > toTime) return false;
    return true;
  });
};

export default OccurrenceConfirmModal;