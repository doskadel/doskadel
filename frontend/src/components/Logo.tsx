import React from 'react';

/** Логотип DoskaDel: неоновый текст (CSS, системный шрифт — ровный и масштабируемый). */
const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => (
  <span className={'logo-neon logo-neon--' + size + (className ? ' ' + className : '')}>DoskaDel</span>
);

export default Logo;
