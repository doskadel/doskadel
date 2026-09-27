import React, { useState, useRef, useEffect } from 'react';

export interface MultiSelectOption {
  value: string | number;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: Array<string | number>;
  onChange: (selected: Array<string | number>) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Все',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const toggleOption = (value: string | number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayText = (): string => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt ? opt.label : String(selected[0]);
    }
    return `${selected.length} выбрано`;
  };

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className={`multi-select-trigger ${selected.length > 0 ? 'multi-select-trigger--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="multi-select-label">{label}:</span>
        <span className="multi-select-value">{getDisplayText()}</span>
        <span className="multi-select-arrow">▾</span>
      </button>

      {open && (
        <div className="multi-select-dropdown">
          {options.length === 0 ? (
            <div className="multi-select-empty">Нет опций</div>
          ) : (
            options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <label key={opt.value} className="multi-select-item">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(opt.value)}
                  />
                  {opt.color && (
                    <span
                      className="multi-select-item-color"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="multi-select-item-label">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;