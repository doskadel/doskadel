const DEFAULT_STATUSES = [
  { name: 'В ожидании', color: '#9ca3af', order: 0, isFinal: false, key: 'pending' },
  { name: 'В работе', color: '#3b82f6', order: 1, isFinal: false, key: 'in_progress' },
  { name: 'Выполнено', color: '#22c55e', order: 2, isFinal: true, key: 'done' },
  { name: 'Отменено', color: '#ef4444', order: 3, isFinal: true, key: 'cancelled' }
];

module.exports = DEFAULT_STATUSES;