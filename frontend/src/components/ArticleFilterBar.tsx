import React, { useState, useRef, useEffect } from 'react';
import { Popover, Listbox, Transition } from '@headlessui/react';
import { Filter, Search, ArrowUpDown, Check, X } from 'lucide-react';
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

const ArticleFilterBar: React.FC<ArticleFilterBarProps> = ({
  q, onQChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onDatesClear,
  onReset, hasActiveFilters, dateError, sort, onSortChange, defaultSort,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  const isSearchActive = q.trim() !== '';
  const isDatesActive = !!(dateFrom || dateTo);
  const isSortActive = sort !== defaultSort;
  const activeSortLabel = ARTICLE_SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Сортировка';
  const filterActive = isDatesActive;

  return (
    <div className="filter-bar">
      <div className="fb-row">
        <Popover className="fb-pop-wrap">
          {({ open }) => (
          <>
          <Popover.Button className={'fb-icon-btn' + (open ? ' fb-icon-btn--active' : '')} title="Фильтры" aria-label="Фильтры">
            <Filter size={18} />
            {filterActive && <span className="fb-dot fb-dot--alert" />}
          </Popover.Button>
          <Transition enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to" leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from">
            <Popover.Panel className="fb-panel" static>
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

        <div className={'fb-search' + (searchOpen ? ' fb-search--open' : '') + (isSearchActive && !searchOpen ? ' fb-search--has' : '')}>
          {!searchOpen && (
            <span className="fb-search-hint">{isSearchActive ? q : 'Поиск...'}</span>
          )}
          {searchOpen && (
            <>
              <input
                ref={searchInputRef}
                type="text"
                className="fb-search-input"
                placeholder="Поиск по статьям..."
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

        <Listbox value={sort} onChange={onSortChange}>
          {({ open }) => (
          <div className="fb-pop-wrap">
            <Listbox.Button className={'fb-icon-btn' + (open ? ' fb-icon-btn--active' : '')} title={`Сортировка: ${activeSortLabel}`} aria-label="Сортировка">
              <ArrowUpDown size={18} />
              {isSortActive && <span className="fb-dot fb-dot--alert" />}
            </Listbox.Button>
            <Transition enter="fb-tr-enter" enterFrom="fb-tr-from" enterTo="fb-tr-to" leave="fb-tr-enter" leaveFrom="fb-tr-to" leaveTo="fb-tr-from">
              <Listbox.Options className="fb-options" static>
                {ARTICLE_SORT_OPTIONS.map((opt) => (
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
      </div>
    </div>
  );
};

export default ArticleFilterBar;
