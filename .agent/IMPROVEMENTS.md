# IMPROVEMENTS: DoskaDel

Реестр предложений (ярус 1, 2026-10-03). Основано на структуре, package.json, поиске по коду и скриншотах дашборда; остальные экраны не просматривались. Статусы: proposed / approved / in-progress / done / rejected. Решает оператор. При работе над пунктом менять статус здесь.

## Оптимизация
- O1 proposed. Ленивая загрузка маршрутов (React.lazy + Suspense): Tasks, Knowledge, CalendarView, ProfileModal, SearchModal. В src нет lazy/Suspense, всё грузится одним бандлом.
- O2 proposed. .lean() в read-запросах бэка (в backend/src не найдено ни одного).
- O3 proposed. Индексы: Task по {userId, срок} (сначала проверить имя поля срока и запросы дашборда), text-индекс для поиска статей. У Occurrence индексы есть.
- O4 proposed. Удалить мёртвые зависимости @mui/material и @emotion/* (не используются в src).
- O5 proposed. Тесты (jest + supertest на бэке): порог «Ближайшие», refresh-токены, проверка владельца.
- O6 proposed. dump.txt и dump.bat лежат в корне (по git ls-files не отслеживаются, PROJECT.md по этому пункту устарел): удалить или в .gitignore.

## Дизайн-система и цвет
- D1 proposed. Заменить 19 hex-цветов и россыпь rgba в index.css токенами, общие --shadow-sm/md/lg. Без этого тёмная тема будет неровной.
- D2 proposed. Палитра по готовым шкалам: Radix Colors (MIT, пары light/dark) или палитра Tailwind. Один акцент, нейтральные серые, семантические success/warning/danger. Контраст текста не ниже AA 4.5:1.
- D3 proposed. Тёмная тема: не чистый чёрный, слои поверхностей, менее насыщенный акцент.
- D4 proposed. Шрифт Inter (OFL) через @fontsource, self-host. Шкала размеров токенами. tabular-nums для чисел и дат.
- D5 proposed. Единые радиусы (карточки ~12px, кнопки ~10px), одна лёгкая тень плюс рамка.
- D6 proposed. Кнопки: primary / secondary / ghost / destructive; состояния hover, active (scale 0.98), focus, disabled, loading; цель нажатия 44px.
- D7 proposed. Статусы и приоритеты: мягкие чипы (тонированный фон + тёмный текст) вместо сплошных.
- D8 proposed. lucide везде с единой толщиной штриха; стрелки календаря заменить иконками.
- D9 proposed. Пустые состояния и скелетоны: иллюстрации unDraw (бесплатно, перекрашиваются; лицензию проверить перед применением) или свои SVG (инструмент svg_save); скелетоны вместо спиннера.
- D10 proposed. Микро-анимации 150-200 мс с учётом prefers-reduced-motion; «Отменить» в тосте вместо диалога подтверждения удаления.
- D11 proposed. PWA и бренд: maskable-иконка, splash, theme-color, оформление экрана входа (наличие сейчас не проверено).
- D12 info. Инструменты для подбора: Realtime Colors, Coolors (сайты, не зависимости).

## Доступность
- A1 proposed. Глобальный :focus-visible (сейчас найден только в двух правилах).
- A2 proposed. Цель нажатия не меньше 44px у всех иконок-кнопок.
- A3 check. CalendarView: div role=button с tabIndex, обработчик Enter/Space не виден, проверить.
- A4 check. prefers-reduced-motion не проверен.

## Предлагаемый порядок
1) токены вместо hex, тени, радиусы (D1, D5); 2) палитра и тёмная тема (D2, D3); 3) кнопки и чипы (D6, D7); 4) шрифт (D4); 5) lazy, lean, индексы (O1-O3); 6) пустые состояния, скелетоны (D9); 7) тесты (O5).
