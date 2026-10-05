import React from 'react';

/** Простой скелетон-плейсхолдер (при холодном старте PWA, чтобы не показывать логин). */
const Skeleton: React.FC = () => (
  <div className="skeleton-page">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line skeleton-line--short" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

export default Skeleton;
