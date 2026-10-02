import React from 'react';
import { RingLoader } from 'react-spinners';

interface LoadingOverlayProps {
  active: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ active, text }) => {
  if (!active) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <RingLoader color="var(--color-primary, #3b82f6)" size={64} speedMultiplier={1} />
      {text ? <div className="loading-overlay-text">{text}</div> : null}
    </div>
  );
};

export default LoadingOverlay;
