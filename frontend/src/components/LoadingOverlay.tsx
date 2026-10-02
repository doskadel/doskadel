import React from 'react';

interface LoadingOverlayProps {
  active: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ active, text }) => {
  if (!active) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-overlay-box">
        <div className="loading-spinner" />
        {text ? <div className="loading-overlay-text">{text}</div> : null}
      </div>
    </div>
  );
};

export default LoadingOverlay;
