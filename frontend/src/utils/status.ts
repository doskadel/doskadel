export interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_COLOR_PALETTE = [
  '#9ca3af', // серый
  '#3b82f6', // синий
  '#22c55e', // зелёный
  '#eab308', // жёлтый
  '#f97316', // оранжевый
  '#ef4444', // красный
  '#ec4899', // розовый
  '#a855f7', // фиолетовый
  '#06b6d4', // циан
  '#14b8a6', // тил
  '#64748b', // slate
  '#0ea5e9', // sky
];