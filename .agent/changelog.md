# CHANGELOG: DoskaDel

Короткие записи по датам (что вошло в main). Новые — сверху.

## 2026-10-05
- **O1, O2, D4 — уже реализованы** (сверка по коду): React.lazy+Suspense в App.tsx, .lean() в контроллерах, Inter подключён в index.tsx. Сняты из плана.
- **S5** (264f128) и **O4** (50b1704) закрыты ранее.
- **O4: удалены мёртвые зависимости** (merge 50b1704). @mui/material, @emotion/react, @emotion/styled не используются в src — убраны из frontend/package.json; npm install, сборка ок.
- **S5: CORS ограничен** (merge 264f128). origin теперь из env CORS_ORIGIN (список через запятую); dev без env — как было (любой origin), prod без env — только same-origin. Проверено на трёх ветках.

## 2026-10-04
- **W1: workspace-фундамент** (merge a090fae). Модели Workspace/Membership, can() (роли как данные), workspaceId во всех доменных моделях, миграция с бэкфиллом, middleware workspaceContext (X-Workspace-Id), перевод API. Личный режим = workspace из одного. Тесты: can 18/18, изоляция 13/13.
- **F1c: повторяемость как параметр задачи** (merge 0a199c5). Одна сущность Task, recurrence = правило (freq/interval/byWeekday/byMonthDay/time/until/count/tz); Occurrence = исключения/история (originalDate-ключ, unique). Вхождения на лету (горизонт 12 мес), API действий (done/skip/undo/move + scope this/following/all), split серии (seriesId/prevTaskId), авто-missed, завершение серии, история по seriesId. UI: диалог действий, календарь+DnD повторяющихся, список/доска/карточка по вхождениям, форма с переключателем «Повторять», история. Убрана старая логика подтверждений (confirm/unconfirm). Тесты 83.
- **Правило tz:** recurrence.tz = IANA-зона, обязателен (валидация), из клиента; расчёты «сегодня»/границ дня в зоне пользователя (X-Timezone); DEFAULT_TZ только в миграции существующих данных.
