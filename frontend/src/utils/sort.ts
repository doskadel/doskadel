export interface SortOption {
  value: string;
  label: string;
}

export const TASK_SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt_desc', label: 'Сначала новые' },
  { value: 'createdAt_asc', label: 'Сначала старые' },
  { value: 'priority_desc', label: 'Высокий приоритет' },
  { value: 'priority_asc', label: 'Низкий приоритет' },
  { value: 'title_asc', label: 'А → Я' },
  { value: 'title_desc', label: 'Я → А' },
];

export const DIARY_SORT_OPTIONS: SortOption[] = [
  { value: 'createdAt_desc', label: 'Сначала новые' },
  { value: 'createdAt_asc', label: 'Сначала старые' },
  { value: 'title_asc', label: 'А → Я' },
  { value: 'title_desc', label: 'Я → А' },
];