import React, { useState, useEffect, useRef } from 'react';
import MultiSelect from './MultiSelect';
import { Status } from '../utils/status';
import { PRIORITY_OPTIONS } from '../utils/priority';
import { TASK_SORT_OPTIONS } from '../utils/sort';

interface FilterBarProps {
  q: string;
  onQChange: (q: string) => void;
  statusIds: string[];
  onStatusIdsChange: (ids: string[]) => void;
  priorityFilter: number[];
  onPriorityFilterChange: (priorities: number[]) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  statuses: Status[];
  onReset: () => void;
  hasActiveFilters: boolean;
  dateError: string;
  sort: string;
  onSortChange: (sort: string) => void;
  hideSort?: boolean;
  dueFilter?: 'overdue' | 'dueSoon' | null;
  onDueFilterClear?: () => void;
}

type OpenPopover = 'search' | 'sort' | 'dates' | null;

const FilterBar: React.FC<FilterBarProps> = ({
  q,
  onQChange,
  statusIds,
  onStatusIdsChange,
  priorityFilter,
  onPriorityFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  statuses,
  onReset,
  hasActiveFilters,
  dateError,
  sort,
  onSortChange,
  hideSort = false,
  dueFilter = null,
  onDueFilterClear,
}) => {
  const [open, setOpen] = useState<OpenPopover>(null);
  const [searchLocal, setSearchLocal] = useState(q);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchLocal(q);
  }, [q]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.filter-popover') || target.closest('.filter-icon-wrap')) {
        return;
      }
      setOpen(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const toggle = (which: OpenPopover) => {
    setOpen((prev) => (prev === which ? null : which));
  };

  const commitSearch = (value: string) => {
    setSearchLocal(value);
    onQChange(value);
  };

  const statusOptions = statuses.map((s) => ({
    value: s._id,
    label: s.name,
    color: s.color,
  }));

  const priorityOptions = PRIORITY_OPTIONS.map((p) => ({
    value: p.value,
    label: p.label,
    color: p.color,
  }));

  const isSearchActive = q.trim() !== '';
  const isDatesActive = !!(dateFrom || dateTo);

  const activeSortLabel =
    TASK_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Сортировка';

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        {/* --- ЛЕВАЯ ЧАСТЬ: чип + фильтры-селекторы + календарь --- */}
        <div className="filter-bar-left">
          {dueFilter && (
            <div className="filter-chip filter-chip--active">
              <span className="filter-chip-label">
                {dueFilter === 'overdue' ? '⚠️ Просрочено' : '📅 Ближайшие 3 дня'}
              </span>
              <button
                type="button"
                className="filter-chip-close"
                onClick={onDueFilterClear}
                aria-label="Убрать фильтр"
                title="Убрать фильтр"
              >
                ✕
              </button>
            </div>
          )}

          <MultiSelect
            label="Статус"
            options={statusOptions}
            selected={statusIds}
            onChange={(values) => onStatusIdsChange(values as string[])}
            placeholder="Все"
          />

          <MultiSelect
            label="Приоритет"
            options={priorityOptions}
            selected={priorityFilter}
            onChange={(values) => onPriorityFilterChange(values as number[])}
            placeholder="Все"
          />

          <div className="filter-icon-wrap filter-icon-wrap--left">
            <button
              type="button"
              className={
                'filter-icon-btn' +
                (isDatesActive ? ' filter-icon-btn--active' : '') +
                (open === 'dates' ? ' filter-icon-btn--open' : '')
              }
              onClick={() => toggle('dates')}
              title="Фильтр по датам"
              aria-label="Фильтр по датам"
              aria-expanded={open === 'dates'}
            >
              📅
            </button>
            {isDatesActive && <span className="filter-icon-dot" />}

            {open === 'dates' && (
              <div className="filter-popover filter-popover--dates">
                <div className="date-range">
                  <div className="date-range-row">
                    <span className="date-range-label">С:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => onDateFromChange(e.target.value)}
                      max={dateTo || undefined}
                    />
                  </div>
                  <div className="date-range-row">
                    <span className="date-range-label">По:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => onDateToChange(e.target.value)}
                      min={dateFrom || undefined}
                    />
                  </div>
                </div>

                {dateError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: 'var(--space-sm)' }}>
                    {dateError}
                  </p>
                )}

                {isDatesActive && (
                  <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="filter-bar-reset"
                      onClick={() => {
                        onDateFromChange('');
                        onDateToChange('');
                      }}
                    >
                      Очистить даты
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- ПРАВАЯ ЧАСТЬ: поиск, сортировка, сброс --- */}
        <div className="filter-bar-right">
          <div className="filter-icon-wrap filter-icon-wrap--right">
            <button
              type="button"
              className={
                'filter-icon-btn' +
                (isSearchActive ? ' filter-icon-btn--active' : '') +
                (open === 'search' ? ' filter-icon-btn--open' : '')
              }
              onClick={() => toggle('search')}
              title={isSearchActive ? `Поиск: ${q}` : 'Поиск'}
              aria-label="Поиск"
              aria-expanded={open === 'search'}
            >
              🔍
            </button>
            {isSearchActive && <span className="filter-icon-dot" />}

            {open === 'search' && (
              <div className="filter-popover filter-popover--search">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск по задачам..."
                  value={searchLocal}
                  onChange={(e) => commitSearch(e.target.value)}
                  className="input"
                />
              </div>
            )}
          </div>

          {!hideSort && (
            <div className="filter-icon-wrap filter-icon-wrap--right">
              <button
                type="button"
                className={
                  'filter-icon-btn' +
                  (open === 'sort' ? ' filter-icon-btn--open' : '')
                }
                onClick={() => toggle('sort')}
                title={`Сортировка: ${activeSortLabel}`}
                aria-label="Сортировка"
                aria-expanded={open === 'sort'}
              >
                ⇅
              </button>

              {open === 'sort' && (
                <div className="filter-popover filter-popover--sort">
                  {TASK_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={
                        'filter-sort-option' +
                        (opt.value === sort ? ' filter-sort-option--active' : '')
                      }
                      onClick={() => {
                        onSortChange(opt.value);
                        setOpen(null);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className="filter-bar-reset"
              onClick={onReset}
              title="Сбросить фильтры"
            >
              ✕ Сбросить
            </button>
          )}
        </div>
      </div>

      {dateError && open !== 'dates' && (
        <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: 'var(--space-sm)' }}>
          {dateError}
        </p>
      )}
    </div>
  );
};

export default FilterBar;