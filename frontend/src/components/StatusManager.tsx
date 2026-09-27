import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import Modal from './Modal';
import { Status, STATUS_COLOR_PALETTE } from '../utils/status';

interface StatusManagerProps {
  open: boolean;
  statuses: Status[];
  onClose: () => void;
  onChanged: () => void;
}

type ViewMode = 'list' | 'edit' | 'create';

const StatusManager: React.FC<StatusManagerProps> = ({ open, statuses, onClose, onChanged }) => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(STATUS_COLOR_PALETTE[0]);
  const [isFinal, setIsFinal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open) {
      setMode('list');
      setEditingStatus(null);
      setError('');
      setTipOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!tipOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tipOpen]);

  const goToList = () => {
    setMode('list');
    setEditingStatus(null);
    setError('');
    setName('');
    setColor(STATUS_COLOR_PALETTE[0]);
    setIsFinal(false);
    setTipOpen(false);
  };

  const startEdit = (status: Status) => {
    setMode('edit');
    setEditingStatus(status);
    setName(status.name);
    setColor(status.color);
    setIsFinal(!!status.isFinal);
    setError('');
    setTipOpen(false);
  };

  const startCreate = () => {
    setMode('create');
    setEditingStatus(null);
    setName('');
    setColor(STATUS_COLOR_PALETTE[0]);
    setIsFinal(false);
    setError('');
    setTipOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit' && editingStatus) {
        await api.put(`/api/statuses/${editingStatus._id}`, {
          name: name.trim(),
          color,
          isFinal,
        });
      } else {
        await api.post('/api/statuses', {
          name: name.trim(),
          color,
          isFinal,
        });
      }
      onChanged();
      goToList();
    } catch (err: any) {
      console.error('Error saving status:', err);
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (status: Status) => {
    if (!window.confirm(`Удалить статус «${status.name}»?`)) return;
    setDeletingId(status._id);
    setError('');
    try {
      await api.delete(`/api/statuses/${status._id}`);
      onChanged();
    } catch (err: any) {
      console.error('Error deleting status:', err);
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = () => {
    if (mode !== 'list') {
      goToList();
      return;
    }
    onClose();
  };

  const modalTitle =
    mode === 'edit' ? 'Редактирование статуса' :
    mode === 'create' ? 'Новый статус' :
    'Управление статусами';

  const rail = mode !== 'list' ? (
    <button
      type="button"
      className="modal-rail-btn"
      onClick={goToList}
      title="Назад к списку"
      aria-label="Назад к списку"
    >
      ←
    </button>
  ) : null;

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} rightRail={rail}>
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>{error}</p>}

      {mode === 'list' && (
        <div>
          {statuses.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 'var(--space-lg)' }}>
              У вас пока нет статусов
            </p>
          ) : (
            <div className="status-list">
              {statuses.map((status) => (
                <div key={status._id} className="status-row">
                  <span
                    className="status-row-color"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="status-row-name">
                    {status.name}
                    {status.isFinal && (
                      <span className="status-row-final-badge" title="Финальный статус">
                        {' '}· финальный
                      </span>
                    )}
                  </span>
                  <div className="status-row-actions">
                    <button
                      type="button"
                      className="icon-button icon-button--sm"
                      onClick={() => startEdit(status)}
                      title="Редактировать"
                      aria-label="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--sm icon-button--danger"
                      onClick={() => handleDelete(status)}
                      title="Удалить"
                      aria-label="Удалить"
                      disabled={deletingId === status._id}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="button"
              onClick={startCreate}
              style={{ width: '100%' }}
            >
              + Добавить статус
            </button>
          </div>
        </div>
      )}

      {(mode === 'edit' || mode === 'create') && (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
            autoFocus
            maxLength={50}
          />

          <div>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
              Цвет
            </p>
            <div className="color-palette">
              {STATUS_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${c === color ? 'color-swatch--active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="checkbox-row-wrap">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
              />
              <span>Финальный статус</span>
            </label>

            <span className="info-icon-wrap" ref={tipRef}>
              <button
                type="button"
                className="info-icon"
                onClick={() => setTipOpen((v) => !v)}
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                aria-label="Справка"
                aria-expanded={tipOpen}
              >
                i
              </button>
              {tipOpen && (
                <div className="info-tooltip" role="tooltip">
                  Задачи в этом статусе не попадут в блоки
                  «Просрочено» и «Ближайшие сроки» на дашборде.
                </div>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
            <button
              type="button"
              className="button"
              onClick={goToList}
              style={{ backgroundColor: 'var(--color-text-muted)' }}
              disabled={saving}
            >
              Отмена
            </button>
            <button type="submit" className="button" disabled={saving || !name.trim()}>
              {saving ? 'Сохранение...' : (mode === 'edit' ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default StatusManager;