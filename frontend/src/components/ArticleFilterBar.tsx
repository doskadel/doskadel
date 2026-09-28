import React, { useState, useEffect, useRef } from 'react';
import ClearableInput from './ClearableInput';
import { ARTICLE_SORT_OPTIONS } from '../utils/sort';

interface ArticleFilterBarProps {
  q: string;
  onQChange: (q: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onDatesClear: () => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  dateError: string;
  sort: string;
  onSortChange: (sort: string) => void;
  defaultSort: string;
}

type OpenPopover = 'search' | 'sort' | 'dates' | null;

const ArticleFilterBar: React.FC<ArticleFilterBarProps> = ({
  q,
  onQChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onDatesClear,
  onReset,
  hasActiveFilters,
  dateError,
  sort,
  onSortChange,
  defaultSort,
}) => {
  const [open, setOpen] = useState<OpenPopover>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const isSearchActive = q.trim() !== '';
  const isDatesActive = !!(dateFrom || dateTo);
  const isSortActive = sort !== defaultSort;

  const activeSortLabel =
    ARTICLE_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Сортировка';

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <div className="filter-bar-left">
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
                      onClick={onDatesClear}
                    >
                      Очистить даты
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
                <ClearableInput
                  type="text"
                  value={q}
                  onChange={onQChange}
                  placeholder="Поиск по базе знаний..."
                  inputRef={searchInputRef}
                />
              </div>
            )}
          </div>

          <div className="filter-icon-wrap filter-icon-wrap--right">
            <button
              type="button"
              className={
                'filter-icon-btn' +
                (isSortActive ? ' filter-icon-btn--active' : '') +
                (open === 'sort' ? ' filter-icon-btn--open' : '')
              }
              onClick={() => toggle('sort')}
              title={`Сортировка: ${activeSortLabel}`}
              aria-label="Сортировка"
              aria-expanded={open === 'sort'}
            >
              ⇅
            </button>
            {isSortActive && <span className="filter-icon-dot" />}

            {open === 'sort' && (
              <div className="filter-popover filter-popover--sort">
                {ARTICLE_SORT_OPTIONS.map((opt) => (
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

export default ArticleFilterBar;