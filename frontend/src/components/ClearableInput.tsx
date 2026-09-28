import React from 'react';

interface ClearableInputProps {
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  className?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const ClearableInput: React.FC<ClearableInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  max,
  className = '',
  autoFocus = false,
  inputRef,
}) => {
  const hasValue = value !== '' && value !== null && value !== undefined;

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`clearable-input ${className}`}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="clearable-input__field"
        autoFocus={autoFocus}
      />
      {hasValue && (
        <button
          type="button"
          className="clearable-input__btn"
          onClick={handleClear}
          aria-label="Очистить"
          title="Очистить"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default ClearableInput;