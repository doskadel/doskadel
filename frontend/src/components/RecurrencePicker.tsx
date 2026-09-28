import React from 'react';
import {
  Recurrence,
  RecurrenceType,
  RECURRENCE_TYPE_OPTIONS,
  WEEKDAYS_RU,
  getDefaultRecurrence,
  localTimeToUtc,
  utcTimeToLocal,
} from '../utils/recurrence';
import ClearableField from './ClearableField';

interface RecurrencePickerProps {
  value: Recurrence | null;
  onChange: (value: Recurrence | null) => void;
}

const RecurrencePicker: React.FC<RecurrencePickerProps> = ({ value, onChange }) => {
  const currentType: RecurrenceType = value?.type || 'daily';

  // В UI показываем ЛОКАЛЬНОЕ время (конвертируем из UTC, где оно хранится)
  const localTime = value ? utcTimeToLocal(value.time) : '';

  const handleTypeChange = (type: RecurrenceType) => {
    if (value?.type === type) return;
    onChange(getDefaultRecurrence(type));
  };

  // Пользователь меняет локальное — конвертируем в UTC для хранения
  const handleTimeChange = (newLocalTime: string) => {
    if (!value) return;
    onChange({ ...value, time: localTimeToUtc(newLocalTime) });
  };

  const handleDayOfWeekChange = (dayOfWeek: number) => {
    if (!value) return;
    onChange({ ...value, dayOfWeek });
  };

  const handleDayOfMonthChange = (dayOfMonth: number) => {
    if (!value) return;
    onChange({ ...value, dayOfMonth });
  };

  const clearDayOfMonth = () => {
    if (!value) return;
    onChange({ ...value, dayOfMonth: 1 });
  };

  const clearTime = () => {
    if (!value) return;
    // Возвращаем дефолтное "09:00" локальное → в UTC
    onChange({ ...value, time: localTimeToUtc('09:00') });
  };

  if (!value) return null;

  return (
    <div className="recurrence-picker">
      <div>
        <label className="input-label">Период</label>
        <select
          className="input"
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value as RecurrenceType)}
        >
          {RECURRENCE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {currentType === 'weekly' && (
        <div>
          <label className="input-label">День недели</label>
          <select
            className="input"
            value={value.dayOfWeek ?? 1}
            onChange={(e) => handleDayOfWeekChange(parseInt(e.target.value, 10))}
          >
            {WEEKDAYS_RU.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {currentType === 'monthly' && (
        <div>
          <label className="input-label">
            День месяца{' '}
            <span
              className="recurrence-hint-icon"
              title="Если в месяце нет такого дня, задача будет назначена на последний день месяца"
            >
              ⓘ
            </span>
          </label>
          <ClearableField onClear={clearDayOfMonth} showClear={value.dayOfMonth !== undefined}>
            <input
              type="number"
              className="input"
              min={1}
              max={31}
              value={value.dayOfMonth ?? ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) handleDayOfMonthChange(Math.min(31, Math.max(1, n)));
              }}
            />
          </ClearableField>
        </div>
      )}

      <div>
        <label className="input-label">Время (ваше локальное)</label>
        <ClearableField onClear={clearTime} showClear={!!localTime}>
          <input
            type="time"
            className="input"
            value={localTime}
            onChange={(e) => handleTimeChange(e.target.value)}
          />
        </ClearableField>
      </div>
    </div>
  );
};

export default RecurrencePicker;