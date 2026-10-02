import React, { ReactNode } from 'react';
import { PullToRefresh as LibPullToRefresh } from 'react-use-pull-to-refresh';
import 'react-use-pull-to-refresh/dist/styles/pull-to-refresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

// Обёртка над react-use-pull-to-refresh (iOS-style анимация, физика, спиннер).
const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled }) => {
  const handleRefresh = async (): Promise<void> => {
    await onRefresh();
  };

  return (
    <LibPullToRefresh
      onRefresh={handleRefresh}
      disabled={disabled}
      pullThreshold={70}
      maxPull={130}
    >
      {children}
    </LibPullToRefresh>
  );
};

export default PullToRefresh;
