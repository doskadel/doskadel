import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Highlighter, X } from 'lucide-react';


const BG_COLORS = [
  '#fef9c3', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b',
  '#dcfce7', '#86efac', '#4ade80', '#22c55e', '#15803d',
  '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8',
  '#f3e8ff', '#d8b4fe', '#c084fc', '#a855f7', '#7c3aed',
  '#fee2e2', '#fecaca', '#fca5a5', '#ef4444', '#b91c1c',
  '#e5e7eb', '#9ca3af', '#4b5563', '#1f2937', '#111827',
];

interface ColorPaletteProps {
  activeColor: string | null;
  onPick: (color: string | null) => void;
  title: string;
  kind: 'text' | 'bg';
}

const POP_W = 220;
const POP_H = 260;

const ColorPalette: React.FC<ColorPaletteProps> = ({ activeColor, onPick, title, kind }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Позиционируем при открытии: под кнопкой, а если не влезает снизу — над ней.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.left;
    if (top + POP_H > window.innerHeight - 8) top = Math.max(8, r.top - POP_H - 6);
    if (left + POP_W > window.innerWidth - 8) left = window.innerWidth - POP_W - 8;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Одна палитра для текста и фона (по просьбе: цвета одинаковые).
  const colors = BG_COLORS;
  const Icon = kind === 'text' ? Palette : Highlighter;

  return (
    <div className="rte-color-wrap">
      <button
        ref={btnRef}
        type="button"
        className={'rte-btn' + (open ? ' rte-btn--active' : '')}
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-label={title}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Icon size={16} />
        <span className="rte-color-indicator" style={{ background: activeColor || 'transparent' }} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="rte-color-pop rte-color-pop--fixed"
          role="dialog"
          aria-label={title}
          style={{ top: pos.top, left: pos.left, width: POP_W }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="rte-color-grid">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="rte-color-swatch"
                style={{ background: c }}
                title={c}
                aria-label={c}
                onClick={() => { onPick(c); setOpen(false); }}
              />
            ))}
          </div>
          <div className="rte-color-actions">
            <input type="color" className="rte-color-custom" title="Свой цвет" onChange={(e) => onPick(e.target.value)} />
            <button type="button" className="rte-color-reset" onClick={() => { onPick(null); setOpen(false); }}>
              <X size={14} /> Сбросить
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ColorPalette;
