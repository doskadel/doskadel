import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

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
  showAllOption?: boolean;
  /** Одиночный выбор (Listbox без multiple) */
  single?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Все',
  single = false,
}) => {
  const getDisplayText = (): string => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt ? opt.label : String(selected[0]);
    }
    return `${selected.length} выбрано`;
  };

  const isActive = selected.length > 0;

  const toggle = (value: string | number) => {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="ms">
      <Listbox value={selected} onChange={() => {}} multiple={!single}>
        <div className="ms-wrap">
          <Listbox.Button className={'ms-trigger' + (isActive ? ' ms-trigger--active' : '')}>
            <span className="ms-label">{label}:</span>
            <span className="ms-value">{getDisplayText()}</span>
            <ChevronDown size={16} className="ms-arrow" />
            {isActive && <span className="ms-dot" />}
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="ms-leave"
            leaveFrom="ms-leave-from"
            leaveTo="ms-leave-to"
          >
            <Listbox.Options className="ms-options" static>
              <div className="ms-header">
                <button
                  type="button"
                  className="ms-all"
                  onClick={() => onChange([])}
                >
                  Все
                </button>
              </div>
              {options.length === 0 ? (
                <div className="ms-empty">Нет опций</div>
              ) : (
                options.map((opt) => {
                  const isSel = selected.includes(opt.value);
                  return (
                    <Listbox.Option key={opt.value} value={opt.value} as={Fragment}>
                      {() => (
                        <li
                          className={'ms-option' + (isSel ? ' ms-option--selected' : '')}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(opt.value); }}
                        >
                          <span className={'ms-check' + (isSel ? ' ms-check--on' : '')}>
                            {isSel && <Check size={14} />}
                          </span>
                          {opt.color && <span className="ms-color" style={{ backgroundColor: opt.color }} />}
                          <span className="ms-option-label">{opt.label}</span>
                        </li>
                      )}
                    </Listbox.Option>
                  );
                })
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default MultiSelect;
