# АУДИТ: фундамент workspace (шаг 1, без правок)

Дата: 2026-10-04. Источник: чтение моделей и контроллеров DoskaDel. Сверка с планом Клода (9 пунктов).

## Модели (7)

| Модель | userId | created_by | workspace_id | soft-delete | Уникальные индексы |
|---|---|---|---|---|---|
| Task | ✅ required | ❌ | ❌ | ❌ | нет (составные с userId) |
| Occurrence | ✅ required | ❌ | ❌ | ❌ | нет |
| Article | ✅ required | ❌ | ❌ | ❌ | нет |
| Status | ✅ required | ❌ | ❌ | ❌ | нет |
| User | — | — | — | — | username, email |
| RefreshToken | ✅ required | — | ❌ | ❌ | token |
| PushSubscription | ✅ required | — | ❌ | ❌ | endpoint |

Категорий/тегов/вложений НЕТ (план упоминал — их пока не существует).

## Что есть (хорошо)
- Изоляция по userId: во всех доменных моделях userId (required, index), контроллеры фильтруют по req.user._id.
- Проверено: articleController, occurrenceController, search, taskController — фильтр владельца есть; на чужой id возвращается 404 (не 403).
- Индексы составные с userId (Task, Occurrence, Article, Status).
- timestamps: true почти везде.

## Чего нет (расхождения с планом)
1. **workspace_id** — нет нигде. План: NOT NULL + индекс у всех доменных сущностей.
2. **memberships** (user↔workspace, роль) — нет.
3. **Роли** (owner/member), **can()** — нет; проверка только 'userId === req.user._id'.
4. **created_by/updated_by/assignee_id** — нет (только userId как владелец).
5. **soft-delete** (deleted_at) — нет.
6. **UUID/ULID** — нет, используются ObjectId (генерируются Mongo, не угадываются — частично ок).
7. **user_settings / workspace_settings** — нет; настройки в User (dashboardSettings, notificationSettings) — единый уровень.
8. **auth_identities** (провайдеры) — нет; только password в User.
9. **Репозиторный слой / единый can()** — нет; проверки владельца размазаны по контроллерам.

## Опасно / на заметку
- Проверки владельца **дублируются** в каждом контроллере (userId: req.user._id) — при переходе на workspace их придётся менять везде. Это и есть причина ввести can() + репозиторий.
- agenda (job'ы) фильтруют по задаче/occurrence без user-контекста (работают по dueAt) — при мультитенантности нужно убедиться, что пуши не смешаются (сейчас фильтр по taskId/userId внутри есть).
- Настройки в User смешают личное и рабочее при workspace — план предлагает разнести.

## Вывод
Схема чистая, изоляция по userId работает. Для workspace-фундамента нужно: добавить workspace_id (миграция+бэкфилл), memberships, can(), репозиторный слой. Модель данных сейчас НЕ мультитенантная, но расширяемая.
