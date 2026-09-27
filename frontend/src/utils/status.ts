export interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  isFinal: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_COLOR_PALETTE = [
  '#9ca3af',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#06b6d4',
  '#14b8a6',
  '#64748b',
  '#0ea5e9',
];