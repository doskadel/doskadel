import React, { ReactNode, useRef, useState, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 70; // px, после которого срабатывает обновление
const MAX_PULL = 110;

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled }) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    // срабатывает только если страница прокручена в самый верх
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      // сопротивление: чем дальше, тем медленнее
      const resisted = Math.min(MAX_PULL, delta * 0.5);
      setPull(resisted);
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = pull >= THRESHOLD;
    if (shouldRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
    startY.current = null;
  }, [pull, onRefresh]);

  return (
    <div
      className="ptr-wrapper"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="ptr-indicator"
        style={{ height: pull, opacity: pull > 0 ? 1 : 0 }}
      >
        <span className={refreshing ? 'ptr-spinner ptr-spinner--spin' : 'ptr-spinner'}>
          {refreshing ? '⟳' : pull >= THRESHOLD ? '↓' : '•'}
        </span>
      </div>
      <div className="ptr-content" style={{ transform: `translateY(${pull}px)` }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
