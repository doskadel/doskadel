import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
}

/**
 * Поле пароля с кнопкой показать/скрыть.
 * Скрыто: все символы — точки, КРОМЕ последнего (iOS-стиль).
 * Показано: обычный текст.
 */
const PasswordInput: React.FC<Props> = ({ value, onChange, placeholder = 'Пароль', className = 'input', required, autoComplete }) => {
  const [visible, setVisible] = useState(false);

  const masked = value ? '•'.repeat(value.length - 1) + value.slice(-1) : '';

  return (
    <div className="password-field">
      <input
        type="text"
        value={visible ? value : masked}
        onChange={(e) => {
          const raw = e.target.value;
          if (visible) {
            onChange(raw);
            return;
          }
          // Скрытый режим: raw = маска. Определяем, что изменилось.
          if (raw.length > value.length) {
            // добавили в конец (типовой случай)
            onChange(value + raw.slice(value.length));
          } else if (raw.length < value.length) {
            // удалили
            onChange(value.slice(0, raw.length));
          } else {
            // замена последнего символа
            onChange(value.slice(0, -1) + raw.slice(-1));
          }
        }}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        title={visible ? 'Скрыть пароль' : 'Показать пароль'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
