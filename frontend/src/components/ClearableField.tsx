import React from 'react';

interface ClearableFieldProps {
  children: React.ReactNode;
  onClear: () => void;
  showClear: boolean;
  className?: string;
}

/**
 * Обёртка для полей с нативными иконками (date, time, datetime-local, number),
 * где крестик внутри поля конфликтует с иконкой.
 * Рендерит поле + кнопку «Очистить» ПОД полем (по правому краю).
 */
const ClearableField: React.FC<ClearableFieldProps> = ({
  children,
  onClear,
  showClear,
  className = '',
}) => {
  return (
    <div className={`clearable-field ${className}`}>
      {children}
      {showClear && (
        <button
          type="button"
          className="clearable-field__clear"
          onClick={onClear}
          title="Очистить"
          aria-label="Очистить"
        >
          Очистить
        </button>
      )}
    </div>
  );
};

export default ClearableField;