import React from 'react';

interface DiaryFilterBarProps {
  q: string;
  onQChange: (q: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  dateError: string;
}

const DiaryFilterBar: React.FC<DiaryFilterBarProps> = ({
  q,
  onQChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReset,
  hasActiveFilters,
  dateError,
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <input
          type="text"
          placeholder="Поиск по дневнику..."
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className="input filter-bar-search"
        />

        <div className="date-range">
          <span className="date-range-label">С:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            max={dateTo || undefined}
          />
          <span className="date-range-label">По:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            min={dateFrom || undefined}
          />
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

      {dateError && (
        <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: 'var(--space-sm)' }}>
          {dateError}
        </p>
      )}
    </div>
  );
};

export default DiaryFilterBar;