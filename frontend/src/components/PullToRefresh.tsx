import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { PullToRefresh as LibPullToRefresh } from 'react-use-pull-to-refresh';
import 'react-use-pull-to-refresh/dist/styles/pull-to-refresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

// Есть ли между целью касания и корнем прокрученный вложенный скролл-контейнер.
// Библиотека проверяет только window.scrollY и на любом движении пальца вниз вызывает
// preventDefault, из-за чего внутренние списки не скроллятся вверх.
const insideScrolledContainer = (target: EventTarget | null): boolean => {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== document.body) {
    const oy = window.getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
};

// Обёртка над react-use-pull-to-refresh (iOS-style анимация, физика, спиннер).
const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled }) => {
  const guardRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const root = guardRef.current;
    if (!root) return;
    const onStart = (e: TouchEvent) => {
      setBlocked(insideScrolledContainer(e.target));
    };
    const onEnd = () => setBlocked(false);
    root.addEventListener('touchstart', onStart, { capture: true, passive: true });
    root.addEventListener('touchend', onEnd, { capture: true, passive: true });
    root.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
    return () => {
      root.removeEventListener('touchstart', onStart, true);
      root.removeEventListener('touchend', onEnd, true);
      root.removeEventListener('touchcancel', onEnd, true);
    };
  }, []);

  const handleRefresh = async (): Promise<void> => {
    await onRefresh();
  };

  return (
    <div ref={guardRef} style={{ display: 'contents' }}>
      <LibPullToRefresh
        onRefresh={handleRefresh}
        disabled={disabled || blocked}
        pullThreshold={70}
        maxPull={130}
      >
        {children}
      </LibPullToRefresh>
    </div>
  );
};

export default PullToRefresh;
