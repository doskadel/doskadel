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

/** Поле пароля с кнопкой показать/скрыть (type=password <-> text). */
const PasswordInput: React.FC<Props> = ({ value, onChange, placeholder = 'Пароль', className = 'input', required, autoComplete }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete={autoComplete}
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
