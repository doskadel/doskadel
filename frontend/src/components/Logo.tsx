import React from 'react';

/** Неоновый логотип DoskaDel (SVG, масштабируется). props.height — высота в px. */
const Logo: React.FC<{ height?: number; className?: string }> = ({ height = 32, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 80"
    height={height}
    className={className}
    role="img"
    aria-label="DoskaDel"
    style={{ display: 'block' }}
  >
    <defs>
      <linearGradient id="dd-logo-g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#60a5fa" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <filter id="dd-logo-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <text x="50%" y="56" textAnchor="middle" fontFamily="Segoe UI, Arial, sans-serif" fontWeight="800" fontSize="34" letterSpacing="1" fill="url(#dd-logo-g)" filter="url(#dd-logo-glow)">DoskaDel</text>
  </svg>
);

export default Logo;
