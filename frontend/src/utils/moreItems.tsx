import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Единый реестр пунктов «Ещё» (точка расширения).
 * Из него рендерятся: мобильная страница /more и десктопное выпадающее меню.
 * Добавление пункта — одна запись здесь.
 *
 * kind:
 *  - 'route'    — внутренний переход (to)
 *  - 'modal'    — открыть окно (action)
 *  - 'external' — внешняя ссылка (href), открывается в новой вкладке
 */
export type MoreItemKind = 'route' | 'modal' | 'external';

export interface MoreItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  kind: MoreItemKind;
  to?: string;
  action?: () => void;
  href?: string;
  /** группа для заголовков в списке: 'main' | 'modals' | 'external' */
  group?: 'main' | 'modals' | 'external';
  /** показывать ли на мобильной странице */
  mobile?: boolean;
  /** показывать ли в десктопном меню */
  desktop?: boolean;
}

/** Пока пусто — точка расширения. Пример записи в комментарии ниже. */
export const moreItems: MoreItem[] = [
  // { id: 'about', label: 'О приложении', kind: 'route', to: '/about', group: 'main' },
  // { id: 'site', label: 'Сайт проекта', kind: 'external', href: 'https://example.com', icon: <ExternalLink size={16} />, group: 'external' },
];

/** Пункт ведёт на внешний ресурс? */
export const isExternal = (i: MoreItem) => i.kind === 'external';
