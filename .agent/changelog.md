# CHANGELOG: DoskaDel

Короткие записи по датам (что вошло в main). Новые — сверху.

## 2026-10-06
- **Статусы: drag-n-drop порядка** (StatusManager + @dnd-kit): ручки GripVertical, reorder через PUT /api/statuses/reorder, порядок влияет на доску.
- **UX-пакет (3)**: (1) тосты на всех действиях (создание/изменение/удаление — Knowledge, StatusManager, TaskDetail, ArticleDetail, ProfileModal, Tasks, Dashboard). (2) Красные звёздочки у обязательных полей (.input-label--required). (3) Понятные тексты ошибок (err.response.data.message + фолбэки). alert() заменён на toast.
- **UX-задачи (3)**: (1) PushPrompt — запрос разрешения на уведомления при первом входе (localStorage-флаг, баннер). (2) Единые заглушки пустых списков `.empty-state` (задачи, статьи, фильтры) с иконкой/заголовком/текстом. (3) Поиск на мобилке: кнопка «Назад», X-очистка поля (при вводе), адаптив шапки.
- **O5 (тесты, начало)**: jest-наборы recurrence/taskKinds/escapeRegex, 12 зелёных (без БД).
- **D6/D7/D10/D11/D8**: кнопки/чипы сверены, «Отменить» в тосте, манифест PWA, стрелки lucide.
- **Светлая тема/фон**: холодная нейтральная палитра (bg #e3e8ef, surface #fff, border #e5eaf2, text #111827, primary #2563eb, danger #dc2626); #root с фоном и min-height:100dvh; мета color-scheme + colorScheme в inline-скрипте (защита от браузерной авто-тёмной); тёмная тема по умолчанию. Единые поверхности/границы/тени карточек.

## 2026-10-05
- **Тёмная тема — по умолчанию** (useTheme + инлайн-скрипт в index.html). Светлая остаётся выбираемой.
- **Светлая тема (D1/D5)**: холодная нейтральная палитра (bg #eaeef4, surface #fff, border #e5eaf2, text #111827, primary #2563eb, danger #dc2626), холодные тени; единые границы+тени карточек (агрегатор), border-strong у шапки/нижнего бара, поля ввода на --color-input, loading-overlay на color-mix(bg). Хардкод #fff/white/rgba-синий убран в токены. Тёмная тема не изменена (добавлены только отсутствовавшие токены).
- **A4** — глобальный prefers-reduced-motion (гасит декоративные анимации).
- **A2** — иконки-кнопки увеличены (40px), dash-arrow 36px (цель нажатия).
- **A3** — Space активирует div role=button (Dashboard/Calendar/Knowledge/SearchModal), помимо Enter.
- **O6** — dump.txt/dump.bat удалены с диска.
- **P3 (CLI reset-password)** — scripts/reset-password.js <email> <пароль>: сброс + отзыв сессий. Проверено.
- **Сессии** — сверка: rotation+reuse, grace 20с, скользящий TTL, «помни меня», absolute max 90д, single-flight — реализованы; добавлена очистка легаси-cookie Path=/.
- **P1 (смена пароля)** — сверка: реализовано (старый+новый, отзыв refresh кроме текущей, сессии, выйти везде); добавлен rate limit на change-password.
- **F1f (финальный статус)** — сверка: реализовано (isFinal-фильтр, activeSince при возврате, запрет возврата completed/split); добавлена миграция scripts/migrate-active-since.js (48 задач, идемпотентна).
- **F1e (ревью F1c)** — сверка: пункты 0-4 уже реализованы (Предстоящие, подпись/сводка повтора, Начало, aria-label, статус вхождения); F1e-5 сделан (история: скрыт '0 из 0', выравнивание); F1e-6 отложен (нужна тест-инфра, O5).
- **fix(календарь): pending не гасит маркеры** (aad1fde). computeOccurrences отдаёт pending-вхождения без переноса как обычные; пропажа маркеров после материализации job закрыта.
- **UI: профиль и настройки** (fecb852). Компактная модалка (max-width 440), крупные тап-таргеты (min-height 52), воздух между блоками, единые радиусы; мобильный профиль не прилипает к низу (safe-area).
- **fix(календарь): нет вхождений раньше createdAt** (406e6aa). computeOccurrences учитывает createdAt как нижнюю границу — маркеры повторяющихся не рисуются до создания задачи.
- **O1, O2, D4 — уже реализованы** (сверка по коду): React.lazy+Suspense в App.tsx, .lean() в контроллерах, Inter подключён в index.tsx. Сняты из плана.
- **S5** (264f128) и **O4** (50b1704) закрыты ранее.
- **O4: удалены мёртвые зависимости** (merge 50b1704). @mui/material, @emotion/react, @emotion/styled не используются в src — убраны из frontend/package.json; npm install, сборка ок.
- **S5: CORS ограничен** (merge 264f128). origin теперь из env CORS_ORIGIN (список через запятую); dev без env — как было (любой origin), prod без env — только same-origin. Проверено на трёх ветках.

## 2026-10-04
- **W1: workspace-фундамент** (merge a090fae). Модели Workspace/Membership, can() (роли как данные), workspaceId во всех доменных моделях, миграция с бэкфиллом, middleware workspaceContext (X-Workspace-Id), перевод API. Личный режим = workspace из одного. Тесты: can 18/18, изоляция 13/13.
- **F1c: повторяемость как параметр задачи** (merge 0a199c5). Одна сущность Task, recurrence = правило (freq/interval/byWeekday/byMonthDay/time/until/count/tz); Occurrence = исключения/история (originalDate-ключ, unique). Вхождения на лету (горизонт 12 мес), API действий (done/skip/undo/move + scope this/following/all), split серии (seriesId/prevTaskId), авто-missed, завершение серии, история по seriesId. UI: диалог действий, календарь+DnD повторяющихся, список/доска/карточка по вхождениям, форма с переключателем «Повторять», история. Убрана старая логика подтверждений (confirm/unconfirm). Тесты 83.
- **Правило tz:** recurrence.tz = IANA-зона, обязателен (валидация), из клиента; расчёты «сегодня»/границ дня в зоне пользователя (X-Timezone); DEFAULT_TZ только в миграции существующих данных.
