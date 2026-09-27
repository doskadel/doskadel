import React from 'react';
import MultiSelect from './MultiSelect';
import { Status } from '../utils/status';
import { PRIORITY_OPTIONS } from '../utils/priority';

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
}

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
}) => {
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

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <input
          type="text"
          placeholder="Поиск по задачам..."
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className="input filter-bar-search"
        />

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

export default FilterBar;