import React, { useState, useRef, useEffect } from 'react';
import { Popover, Listbox, Transition } from '@headlessui/react';
import { Filter, Search, ArrowUpDown, Calendar, Check, ChevronDown, X } from 'lucide-react';
import MultiSelect from './MultiSelect';
import { Status } from '../utils/status';
import { PRIORITY_OPTIONS } from '../utils/priority';
import { TASK_SORT_OPTIONS } from '../utils/sort';

export type TaskTypeFilter = 'single' | 'recurring' | null;

interface FilterBarProps {
  q: string;
  onQChange: (q: string) => void;
  statusIds: string[];
  onStatusIdsChange: (ids: string[]) => void;
  priorityFilter: number[];
  onPriorityFilterChange: (priorities: number[]) => void;
  taskType: TaskTypeFilter;
  onTaskTypeChange: (v: TaskTypeFilter) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onDatesClear: () => void;
  statuses: Status[];
  onReset: () => void;
  hasActiveFilters: boolean;
  dateError: string;
  sort: string;
  onSortChange: (sort: string) => void;
  defaultSort: string;
  hideSort?: boolean;
  dueFilter?: 'overdue' | 'dueSoon' | null;
  onDueFilterClear?: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  q, onQChange, statusIds, onStatusIdsChange, priorityFilter, onPriorityFilterChange,
  taskType, onTaskTypeChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onDatesClear,
  statuses, onReset, hasActiveFilters, dateError, sort, onSortChange, defaultSort, hideSort = false,
  dueFilter = null, onDueFilterClear,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  const statusOptions = statuses.map((s) => ({ value: s._id, label: s.name, color: s.color }));
  const priorityOptions = PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }));
  const taskTypeOptions = [
    { value: 'single', label: 'Разовые' },
    { value: 'recurring', label: 'Повторяющиеся' },
  ];
  const taskTypeSelected = taskType ? [taskType] : [];
  const handleTaskTypeChange = (values: Array<string | number>) => {
    onTaskTypeChange(values.length === 0 ? null : (values[values.length - 1] as TaskTypeFilter));
  };

  const isSearchActive = q.trim() !== '';
  const isDatesActive = !!(dateFrom || dateTo);
  const isSortActive = sort !== defaultSort;
  const activeSortLabel = TASK_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Сортировка';
  // Маркер фильтра — только по полям фильтра (без поиска и сортировки)
  const filterActive = statusIds.length > 0 || priorityFilter.length > 0 || !!taskType || isDatesActive || !!dueFilter;

  return (
    <div className="filter-bar">
      <div className="fb-row">
        {/* Фильтры — под одной кнопкой */}
        <Popover className="fb-pop-wrap">
          {({ open }) => (
          <>
          <Popover.Button className={'fb-icon-btn' + (open ? ' fb-icon-btn--active' : '')} title="Фильтры" aria-label="Фильтры">
            <Filter size={18} />
            {filterActive && <span className="fb-dot fb-dot--alert" />}
          </Popover.Button>
          <Transition enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to" leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from">
            <Popover.Panel className="fb-panel" static>
              <div className="fb-field"><MultiSelect label="Статус" options={statusOptions} selected={statusIds} onChange={(v) => onStatusIdsChange(v as string[])} placeholder="Все" /></div>
              <div className="fb-field"><MultiSelect label="Приоритет" options={priorityOptions} selected={priorityFilter} onChange={(v) => onPriorityFilterChange(v as number[])} placeholder="Все" /></div>
              <div className="fb-field"><MultiSelect label="Тип" options={taskTypeOptions} selected={taskTypeSelected} onChange={handleTaskTypeChange} placeholder="Все" /></div>
              {dueFilter && (
                <div className="fb-field">
                  <span className="fb-field-label">Срок</span>
                  <div className="fb-chip">
                    <span>{dueFilter === 'overdue' ? 'Просрочено' : 'Ближайшие 3 дня'}</span>
                    <button type="button" className="fb-chip-close" onClick={onDueFilterClear} aria-label="Убрать"><X size={14} /></button>
                  </div>
                </div>
              )}
              <div className="fb-field">
                <span className="fb-field-label">Даты</span>
                <div className="fb-dates">
                  <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} max={dateTo || undefined} />
                  <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} min={dateFrom || undefined} />
                </div>
                {isDatesActive && <button type="button" className="fb-clear" onClick={onDatesClear}>Очистить даты</button>}
              </div>
              {dateError && <p className="fb-error">{dateError}</p>}
              {hasActiveFilters && (
                <button type="button" className="fb-reset" onClick={onReset}><X size={14} /> Сбросить фильтры</button>
              )}
            </Popover.Panel>
          </Transition>
          </>
          )}
        </Popover>

        {!searchOpen && <div className="fb-spacer" />}

        {/* Поиск: капсула (поле + кнопка в одной рамке) */}
        <div className={'fb-search' + (searchOpen ? ' fb-search--open' : '') + (isSearchActive && !searchOpen ? ' fb-search--has' : '')}>
          {searchOpen && (
            <>
              <input
                ref={searchInputRef}
                type="text"
                className="fb-search-input"
                placeholder="Поиск..."
                value={q}
                onChange={(e) => onQChange(e.target.value)}
              />
              {q && (
                <button type="button" className="fb-search-clear" onClick={() => onQChange('')} aria-label="Очистить">
                  <X size={16} />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="fb-search-btn"
            onClick={() => setSearchOpen((v) => !v)}
            title="Поиск"
            aria-label="Поиск"
          >
            <Search size={18} />
            {isSearchActive && <span className="fb-dot fb-dot--alert" />}
          </button>
        </div>

        {/* Сортировка */}
        {!hideSort && (
          <Listbox value={sort} onChange={onSortChange}>
            {({ open }) => (
            <div className="fb-pop-wrap">
              <Listbox.Button className={'fb-icon-btn' + (open ? ' fb-icon-btn--active' : '')} title={`Сортировка: ${activeSortLabel}`} aria-label="Сортировка">
                <ArrowUpDown size={18} />
                {isSortActive && <span className="fb-dot fb-dot--alert" />}
              </Listbox.Button>
              <Transition enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to" leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from">
                <Listbox.Options className="fb-options" static>
                  {TASK_SORT_OPTIONS.map((opt) => (
                    <Listbox.Option key={opt.value} value={opt.value} className="fb-option">
                      {({ selected }) => (
                        <>
                          <span className={'fb-check' + (selected ? ' fb-check--on' : '')}>{selected && <Check size={14} />}</span>
                          <span>{opt.label}</span>
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
            )}
          </Listbox>
        )}
      </div>

    </div>
  );
};

export default FilterBar;
