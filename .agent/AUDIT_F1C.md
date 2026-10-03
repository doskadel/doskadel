# АУДИТ F1C: переделка повторяемости (без правок)

Дата: 2026-10-04. Цель (модель арбитра): одна сущность Task, recurrence = правило (freq/interval/byWeekday/until|count/tz); Occurrence = исключения и история (originalDate ключ, dueAt если перенесено, status pending|done|skipped|missed, completedAt/By). Будущие даты из правила на лету; запись Occurrence только при действии.

## Что есть сейчас

### Task.recurrence (backend/src/models/Task.js)
- Поля: type ('daily'|'weekly'|'monthly'), time ('HH:mm'), dayOfWeek (0-6), dayOfMonth (1-31).
- НЕТ: interval, byWeekday (несколько), until, count, tz.
- НЕТ отдельного флага: наличие recurrence.type = повторяющаяся (совпадает с целевой моделью — ок).

### Occurrence (backend/src/models/Occurrence.js)
- taskId, userId, workspaceId, createdBy, dueAt (required, index), status ('pending'|'done'), confirmedAt, notificationsSent, completedBy, deletedAt.
- НЕТ: originalDate (ключ), skipped/missed в status, completedAt (есть confirmedAt).
- Вхождения СОЗДАЮТСЯ ЗАРАНЕЕ (горизонт 7 дней): generateOccurrencesForTask (taskController) + agenda job 'generate recurring occurrences'.

### Генерация (backend/src/utils/recurrence.js)
- getNextOccurrences(recurrence, fromExclusive, count): daily/weekly/monthly, UTC, без until/count.
- formatRecurrence: текст правила.
- Всё в UTC (время вхождения — UTC, показывается локально). TZ не учитывается.

### Единая абстракция сроков (R1)
- dueItems.js (agenda): плоский список вхождений (Occurrence по dueAt + Task-разовые по dueDate).
- taskDueSummary.js: сводка по задаче (pendingCount, lastOverdueAt, nextDueAt) для dashboard/getTasks.
- Оба уже workspace-aware.

### Agenda (backend/src/agenda.js)
- job 'generate recurring occurrences': досоздаёт вхождения на горизонт 7 дней.
- 4 push-job (pre-due/at-due/overdue/day-before) через sendDuePushes (occurrence+single).
- cleanup old occurrences.

### UI (frontend)
- Доска (KanbanBoard): карточка на задачу, колонка по статусу задачи (НЕ текущего вхождения).
- Список (Tasks): карточка задачи, pendingOccurrenceCount (бейдж), nextOccurrenceDueAt.
- Календарь (CalendarView): вхождения по nextOccurrenceDueAt/lastOverdueAt; DnD только разовых (F1b).

## Расхождения с целевой моделью

1. **Occurrence создаются заранее** (горизонт 7 дней), а в целевой — только при действии (done/skip/move), регенерация их не затирает. Сейчас generateOccurrencesForTask досоздаёт, но не затирает done (фильтр existing по dueAt) — частично ок, но модель другая.
2. **Нет originalDate** — ключа вхождения. Сейчас ключ фактически dueAt. При переносе (F1b) dueAt меняется — теряется привязка к расписанию.
3. **status только pending|done** — нет skipped|missed. Нет авто-missed.
4. **recurrence беднее**: нет interval, byWeekday (несколько), until, count, tz. Нет завершения серии (после count/until, ручное 'Завершить повторение').
5. **Доска/список**: колонка/статус по задаче, а в целевой — по текущему вхождению. После 'Выполнено' карточка должна вернуться в 'В ожидании' с новой датой, в 'Готово' вхождения не копятся.
6. **DnD повторяющихся запрещён** (F1b) — в целевой включается (диалог 'Только это / Это и следующие / Все').
7. **История вхождений** — нет вкладки в карточке задачи.
8. **TZ/переход на летнее время** — сейчас всё UTC, без tz.
9. **Авто-missed**: показывать только последнее просроченное, старые -> missed.

## Где жёстко разделены разовые и повторяющиеся
- recurrence.type (null = разовая); SINGLE/RECURRING (taskKinds.js).
- dueItems: две ветки (occurrence|single).
- agenda: 4 push-job обрабатывают оба (sendDuePushes).
- UI: доска/список — карточка задачи; календарь — вхождения.
- Модель УЖЕ близка к целевой: одна Task, recurrence = параметр. Разделения на 'серии' НЕТ (хорошо).

## Риски
- Миграция Occurrence: dueAt -> originalDate (ключ), добавить статусы skipped/missed, completedAt. Существующие done/pending мапятся.
- recurrence: daily->{freq:'daily',interval:1}, weekly->{freq:'weekly',interval:1,byWeekday:[dayOfWeek]}, monthly->{freq:'monthly',interval:1,byDay:dayOfMonth}. until/count нет — бессрочные.
- Смена семантики доски/списка (статус по вхождению) — риск сломать UI, менять пачками.
- DnD повторяющихся: нужна модель исключений (F1c) — снять запрет F1b.
- TZ: сейчас UTC; добавление tz — отдельный слой.

## План миграции данных (migrate-recurrence.js, идемпотентный, dry-run, mongodump)

**Task.recurrence** (старое -> новое):
- daily -> { freq: 'daily', interval: 1, time }
- weekly -> { freq: 'weekly', interval: 1, byWeekday: [dayOfWeek ?? 1], time }
- monthly -> { freq: 'monthly', interval: 1, byMonthDay: dayOfMonth ?? 1, time }
- until/count: отсутствуют у старых -> null (бессрочные).
- Нет recurrence -> разовая (не трогаем).

**Occurrence** (старое -> новое):
- originalDate = dueAt (ключ; миграция проставляет для существующих).
- status: pending -> pending, done -> done (skipped/missed не появляются задним числом).
- completedAt = confirmedAt (переименование/копия).
- dueAt: если переноса не было = originalDate; иначе остаётся.
- Добавить unique-индекс {taskId, originalDate} (после бэкфилла, идемпотентно).

**Порядок:** mongodump -> dry-run (счётчики) -> запуск -> повторный запуск (0 изменений). Миграция НЕ удаляет данные, только добавляет поля/индексы.

**Проверки dry-run:** число Task с recurrence (по типам), число Occurrence (pending/done), сколько originalDate проставится.

## Этапы (оценка)
1. Модель + миграция (Task.recurrence новое, Occurrence originalDate/status/completedAt) + тесты. [крупно]
2. agenda/dueItems: генерация на лету (горизонт 12 мес), не затирать исключения. [средне]
3. API действий: done/skip/move + scope (это/это и следующие/все). [средне]
4. UI: доска (статус по вхождению), список, календарь (done/skip), диалог переноса, история. [крупно]
5. Тесты: исключения не затираются, scope, авто-missed, count/until, изоляция, tz. [средне]
