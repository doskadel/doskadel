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
        <label className="input-label">Повтор</label>
        <div className="recur-row">
          <span className="recur-word">Каждые</span>
          <input
            type="number"
            className="input recur-num"
            min={1}
            max={30}
            value={value.interval || 1}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10) || 1)}
          />
          <select className="input recur-unit" value={freq} onChange={(e) => handleFreqChange(e.target.value as RecurrenceFreq)}>
            <option value="daily">{value.interval === 1 ? 'день' : 'дней'}</option>
            <option value="weekly">{value.interval === 1 ? 'неделю' : 'недель'}</option>
            <option value="monthly">{value.interval === 1 ? 'месяц' : 'месяцев'}</option>
          </select>
        </div>
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
        <label className="input-label">Начало</label>
        <input
          type="date"
          className="input"
          value={value.startDate ? value.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ ...value, startDate: new Date(e.target.value + 'T00:00:00Z').toISOString() })}
        />
      </div>

      <div>
        <label className="input-label">Время</label>
        <input type="time" className="input" value={value.time || '09:00'} onChange={(e) => handleTimeChange(e.target.value)} />
      </div>

      <div>
        <label className="input-label">Окончание</label>
        <select
          className="input"
          value={value.until ? 'until' : value.count ? 'count' : 'never'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'never') onChange({ ...value, until: null, count: null });
            else if (v === 'until') onChange({ ...value, until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), count: null });
            else onChange({ ...value, count: 10, until: null });
          }}
        >
          <option value="never">Никогда</option>
          <option value="until">До даты</option>
          <option value="count">После N раз</option>
        </select>
        {value.until && (
          <input
            type="date"
            className="input"
            style={{ marginTop: 8 }}
            value={value.until.slice(0, 10)}
            onChange={(e) => onChange({ ...value, until: new Date(e.target.value + 'T23:59:59Z').toISOString() })}
          />
        )}
        {value.count && (
          <input
            type="number"
            className="input"
            style={{ marginTop: 8 }}
            min={1}
            value={value.count}
            onChange={(e) => onChange({ ...value, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
        )}
      </div>

      <p className="recurrence-tz-hint">Часовой пояс: {value.tz || getBrowserTz()}</p>
    </div>
  );
};

export default RecurrencePicker;
