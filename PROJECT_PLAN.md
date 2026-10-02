# DoskaDel - План реализации проекта

## 1. Общая архитектура

### 1.1 Микросервисная архитектура
Backend сервис (Node.js + Express).
Frontend сервис (React + TypeScript).
Database (MongoDB).
Планировщик (Agenda, встроен в backend).
Docker контейнеры для каждого компонента.

### 1.2 Функциональные модули
1. Аутентификация и авторизация — реализовано
2. Управление задачами (канбан + список, статусы, приоритеты, сроки) — реализовано
3. Повторяющиеся задачи (daily/weekly/monthly, система подтверждений) — реализовано
4. База знаний (статьи, фильтры, поиск) — реализовано
5. Поиск и фильтрация (локальный + глобальный command palette) — реализовано
6. Дашборд с агрегацией дедлайнов — реализовано
7. Web Push-уведомления — реализовано
8. PWA (устанавливается на телефон) — реализовано
9. Синхронизация данных — в планах
10. Чат-бот / Ассистент — в планах

## 2. Backend реализация

### 2.1 Технологии
Node.js 20 с Express.js.
MongoDB 7 с Mongoose 7.
JWT для аутентификации.
Agenda 5 для планировщика.
web-push 3 для отправки пушей.
Docker для контейнеризации.

### 2.2 API endpoints

Auth
POST /api/auth/register — регистрация
POST /api/auth/login — вход

Statuses (требуют JWT)
GET /api/statuses — все статусы пользователя
POST /api/statuses — создание
PUT /api/statuses/reorder — переупорядочивание
PUT /api/statuses/:id — обновление
DELETE /api/statuses/:id — удаление

Tasks (требуют JWT)
GET /api/tasks — список задач
POST /api/tasks — создание
GET /api/tasks/:id — одна задача
PUT /api/tasks/:id — обновление
DELETE /api/tasks/:id — удаление
PUT /api/tasks/reorder — переупорядочивание

Occurrences (требуют JWT)
GET /api/occurrences/pending — наступившие вхождения
GET /api/occurrences/by-task/:taskId — вхождения задачи
GET /api/occurrences/:id — одно вхождение
PUT /api/occurrences/confirm — пакетное подтверждение
PUT /api/occurrences/unconfirm — пакетная отмена

Push (требуют JWT)
GET /api/push/vapid-public-key — публичный VAPID-ключ
POST /api/push/subscribe — сохранить подписку
DELETE /api/push/unsubscribe — удалить подписку
GET /api/push/subscriptions — список подписок
POST /api/push/test — тестовое уведомление

Users (требуют JWT)
GET /api/users/me — текущий пользователь
PUT /api/users/notification-settings — настройки уведомлений
PUT /api/users/avatar — аватар

Articles (требуют JWT)
GET /api/articles — список статей
POST /api/articles — создание
GET /api/articles/:id — одна статья
PUT /api/articles/:id — обновление
DELETE /api/articles/:id — удаление

Search (требует JWT)
GET /api/search?q=<query> — поиск по задачам и статьям

Dashboard (требует JWT)
GET /api/dashboard — агрегированные данные

### 2.3 Структура данных

User: _id, username (unique), email (unique, lowercase), password (bcrypt), avatar, notificationSettings, createdAt, updatedAt

Status: _id, userId (ref User), name, color (hex), order, isFinal (Boolean), createdAt, updatedAt

Task: _id, userId (ref User), title, description, statusId (ref Status), priority (1-3), order, dueDate (Date, UTC), recurrence, notifications, notificationsSent, createdAt, updatedAt

Occurrence: _id, taskId (ref Task), userId (ref User), dueAt (Date, UTC), status (pending|done), confirmedAt, notificationsSent, createdAt, updatedAt

PushSubscription: _id, userId (ref User), endpoint (unique), keys (p256dh, auth), userAgent, createdAt, updatedAt

Article: _id, userId (ref User), title, content, createdAt, updatedAt

## 3. Frontend реализация

### 3.1 Технологии
React 18 с TypeScript 4.9.
Create React App 5.
react-router-dom 6.
axios (централизованный клиент с interceptor).
CSS-переменные (без UI-библиотек).
@dnd-kit (drag-n-drop для канбана).
Service Worker + Push API.

### 3.2 Основные компоненты
Auth: Login, Register.
Layout: шапка с навигацией (Главная, Мои задачи, База знаний, Поиск, Профиль).
Dashboard: плашки по статусам, просрочено, ближайшие сроки, последние задачи, последние статьи, быстрые действия.
Tasks: канбан + список, фильтры в поповерах, StatusManager, TaskModal (TaskModalContent + TaskModalRail + useTaskDetail), OccurrenceConfirmModal, RecurrencePicker.
Knowledge: сетка статей, ArticleModal (ArticleModalContent + ArticleModalRail + useArticleDetail).
Search: command palette (SearchModal).
Profile: ProfileModal с экранами profile / settings / notifications.

### 3.3 Структура приложения

doskadel/
  .gitignore
  PROJECT_PLAN.md
  README.md
  docker-compose.yml
  package.json

  backend/
    .env.example
    Dockerfile
    package.json
    server.js
    src/
      agenda.js
      controllers/
        articleController.js
        authController.js
        dashboardController.js
        occurrenceController.js
        pushController.js
        statusController.js
        taskController.js
        userController.js
      middleware/
        auth.js
        errorHandler.js
      models/
        Article.js
        Occurrence.js
        PushSubscription.js
        Status.js
        Task.js
        User.js
      routes/
        articles.js
        auth.js
        dashboard.js
        occurrences.js
        push.js
        search.js
        statuses.js
        tasks.js
        users.js
      utils/
        defaultStatuses.js
        recurrence.js
        webPush.js

  frontend/
    .env.example
    Dockerfile
    package.json
    tsconfig.json
    public/
      index.html
      manifest.json
      service-worker.js
      favicon-96x96.png, favicon.ico, favicon.svg
      logo192.png, logo512.png, apple-touch-icon.png
      site.webmanifest
    src/
      App.css
      App.tsx
      index.css
      index.tsx
      serviceWorkerRegistration.ts
      components/
        ArticleDetail.tsx
        ArticleFilterBar.tsx
        ArticleModal.tsx
        ArticleModalContent.tsx
        ArticleModalRail.tsx
        ClearableField.tsx
        ClearableInput.tsx
        ConfirmDialog.tsx
        ConfirmProvider.tsx
        Dashboard.tsx
        FilterBar.tsx
        KanbanBoard.tsx
        Knowledge.tsx
        Layout.tsx
        Login.tsx
        Modal.tsx
        MultiSelect.tsx
        OccurrenceConfirmModal.tsx
        ProfileModal.tsx
        ProtectedRoute.tsx
        RecurrencePicker.tsx
        Register.tsx
        SearchModal.tsx
        StatusManager.tsx
        TaskDetail.tsx
        TaskModal.tsx
        TaskModalContent.tsx
        TaskModalRail.tsx
        Tasks.tsx
      hooks/
        useArticleDetail.ts
        useMediaQuery.ts
        useOccurrences.ts
        useTaskDetail.ts
      utils/
        api.ts
        date.ts
        priority.ts
        push.ts
        recurrence.ts
        sort.ts
        status.ts
        token.ts

## 4. Docker конфигурация

docker-compose.yml — три сервиса: backend, frontend, mongo.
MongoDB 7.0 с named volume mongo_data и healthcheck.
Backend и frontend монтируются через volume (hot-reload).

## 5. Этапы реализации

Этап 1: Подготовка и базовая структура — завершён
Этап 2: Аутентификация и базовые API — завершён
Этап 3: Поиск и фильтрация — завершён
Этап 4: Канбан и статусы — завершён
Этап 5: Дашборд с агрегацией — завершён
Этап 6: База знаний (статьи) — завершён
Этап 7: Глобальный поиск (command palette) — завершён
Этап 8: Сроки задач (dueDate с датой и временем, UTC) — завершён
Этап 9: Повторяющиеся задачи с системой подтверждений — завершён
Этап 10: Web Push-уведомления — завершён
Этап 11: Профиль и настройки уведомлений — завершён
Этап 12: PWA (устанавливается на телефон) — завершён
Этап 13: Синхронизация данных — в планах
Этап 14: Чат-бот / Ассистент — в планах

## 6. В планах

### Функционал
Связи между задачами и статьями.
Файлы и таблицы в статьях (Markdown).
Кнопка «Прекратить повторение» в rail модалки задачи.

### UX
Тёмная тема (переключатель + сохранение в localStorage).
Иконки (lucide-react).
Адаптив под мобильные (полировка).

### Перспективное
Синхронизация в реальном времени (WebSocket).
Чат-бот / Ассистент (текстовые и голосовые команды).
i18n (RU/EN).
Экспорт данных.

### Технический долг
Миграция с CRA 5 на Vite.
Ограничить CORS для продакшена.
Вынести VAPID-ключи из .env.example (оставить заглушки).