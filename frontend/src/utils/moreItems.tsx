import React from 'react';
import { Info, Mail } from 'lucide-react';
import { SUPPORT_EMAIL, buildMailto } from './support';

/**
 * Единый реестр пунктов «Ещё» (точка расширения).
 * Рендерится в мобильной странице /more и в десктопном выпадающем меню.
 * Добавление пункта — одна запись здесь.
 *
 * kind:
 *  - 'route'    — внутренний переход (to)
 *  - 'modal'    — открыть окно (action)
 *  - 'external' — внешняя ссылка/почта (href); externalLink=false — иконка письма без ↗ (mailto)
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
  /** для external: true (по умолчанию) — стрелка ↗; false — не показывать (напр. mailto) */
  externalLink?: boolean;
  /** группа: 'main' (без заголовка) | 'modals' | 'external' */
  group?: 'main' | 'modals' | 'external';
  mobile?: boolean;
  desktop?: boolean;
}

export interface MoreHandlers {
  openAbout: () => void;
}

/** Собрать пункты «Ещё». Действия модалок приходят из компонента-владельца. */
export function buildMoreItems({ openAbout }: MoreHandlers): MoreItem[] {
  return [
    {
      id: 'about',
      label: 'О приложении',
      icon: <Info size={16} />,
      kind: 'modal',
      action: openAbout,
      group: 'main',
    },
    {
      id: 'feedback',
      label: 'Написать нам',
      icon: <Mail size={16} />,
      kind: 'external',
      href: buildMailto('DoskaDel: обратная связь'),
      externalLink: false,
      group: 'main',
    },
  ];
}
