export const PRIORITY_OPTIONS: Array<{ value: 1 | 2 | 3; label: string; color: string }> = [
  { value: 1, label: 'Низкий', color: '#22c55e' },
  { value: 2, label: 'Средний', color: '#f59e0b' },
  { value: 3, label: 'Высокий', color: '#ef4444' },
];

export const getPriorityLabel = (priority: number): string => {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || 'Неизвестно';
};
