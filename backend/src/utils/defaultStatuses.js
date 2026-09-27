const DEFAULT_STATUSES = [
  { name: 'В ожидании', color: '#9ca3af', order: 0, isFinal: false },
  { name: 'В работе', color: '#3b82f6', order: 1, isFinal: false },
  { name: 'Выполнено', color: '#22c55e', order: 2, isFinal: true },
  { name: 'Отменено', color: '#ef4444', order: 3, isFinal: true }
];

module.exports = DEFAULT_STATUSES;