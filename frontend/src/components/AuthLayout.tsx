import React, { ReactNode } from 'react';
import { ListChecks, Repeat, BookOpen } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  error?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * AUTH-2/3/5: общий каркас зоны входа.
 * Десктоп >=1024px: split 50/50 — форма слева, промо справа.
 * Мобилка/планшет: только форма по центру, промо скрыто.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, error, children, footer }) => {
  return (
    <div className="auth-layout">
      <div className="auth-layout-form">
        <div className="auth-card">
          <div className="auth-brand">DoskaDel</div>
          <h2 className="auth-title">{title}</h2>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {error && <p className="auth-error" role="alert" aria-live="polite">{error}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>

      <aside className="auth-layout-promo" aria-hidden="true">
        <div className="auth-promo-inner">
          <h1 className="auth-promo-title">Задачи, планы и знания — в одном месте</h1>
          <ul className="auth-promo-list">
            <li><ListChecks size={20} /> Список, доска и календарь</li>
            <li><Repeat size={20} /> Повторяющиеся задачи и напоминания</li>
            <li><BookOpen size={20} /> База знаний и быстрый поиск</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default AuthLayout;
