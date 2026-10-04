import React from 'react';
import {
  Recurrence,
  RecurrenceFreq,
  RECURRENCE_FREQ_OPTIONS,
  WEEKDAYS_RU,
  getDefaultRecurrence,
  getBrowserTz,
} from '../utils/recurrence';

interface RecurrencePickerProps {
  value: Recurrence | null;
  onChange: (value: Recurrence | null) => void;
}

const RecurrencePicker: React.FC<RecurrencePickerProps> = ({ value, onChange }) => {
  if (!value) return null;
  const freq = value.freq || 'daily';

  const handleFreqChange = (f: RecurrenceFreq) => {
    if (value.freq === f) return;
    onChange(getDefaultRecurrence(f));
  };

  const handleTimeChange = (time: string) => {
    onChange({ ...value, time, tz: value.tz || getBrowserTz() });
  };

  const toggleWeekday = (day: number) => {
    const cur = value.byWeekday || [];
    const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort();
    onChange({ ...value, byWeekday: next });
  };

  const handleIntervalChange = (interval: number) => {
    onChange({ ...value, interval: Math.max(1, interval) });
  };

  return (
    <div className="recurrence-picker">
      <div>
        <label className="input-label">Период</label>
        <select className="input" value={freq} onChange={(e) => handleFreqChange(e.target.value as RecurrenceFreq)}>
          {RECURRENCE_FREQ_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="input-label">Каждые N {freq === 'daily' ? 'дней' : freq === 'weekly' ? 'недель' : 'месяцев'}</label>
        <input
          type="number"
          className="input"
          min={1}
          max={30}
          value={value.interval || 1}
          onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10) || 1)}
        />
      </div>

      {freq === 'weekly' && (
        <div>
          <label className="input-label">Дни недели</label>
          <div className="weekday-toggles">
            {WEEKDAYS_RU.map((d) => (
              <button
                key={d.value}
                type="button"
                className={'weekday-toggle' + ((value.byWeekday || []).includes(d.value) ? ' weekday-toggle--on' : '')}
                onClick={() => toggleWeekday(d.value)}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {freq === 'monthly' && (
        <div>
          <label className="input-label">
            День месяца{' '}
            <span className="recurrence-hint-icon" title="Если в месяце нет такого дня, задача будет на последний день месяца">ⓘ</span>
          </label>
          <input
            type="number"
            className="input"
            min={1}
            max={31}
            value={value.byMonthDay ?? 1}
            onChange={(e) => onChange({ ...value, byMonthDay: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
          />
        </div>
      )}

      <div>
        <label className="input-label">Время (ваше локальное)</label>
        <input type="time" className="input" value={value.time || '09:00'} onChange={(e) => handleTimeChange(e.target.value)} />
      </div>

      <p className="recurrence-tz-hint">Часовой пояс: {value.tz || getBrowserTz()}</p>
    </div>
  );
};

export default RecurrencePicker;
