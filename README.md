# WorkList

Кроссплатформенное приложение для управления задачами и ведения базы знаний с синхронизацией данных между устройствами через аккаунт. Поддерживает повторяющиеся задачи, Web Push-уведомления, PWA и работу оффлайн.

## Текущий статус

MVP полностью работает: аутентификация, CRUD задач (канбан + список), статусы (включая финальные), сроки, повторяющиеся задачи с системой подтверждений, Web Push-уведомления (Desktop / Android / iOS через PWA), база знаний (статьи), глобальный поиск, дашборд с агрегацией дедлайнов, профиль с настройками уведомлений, PWA (устанавливается на телефон).

## Что уже реализовано

### Аутентификация
Регистрация с валидацией (username 3-30, email, password min 6). Логин по email + пароль (bcrypt). JWT-сессии (24 часа). Защищённые маршруты (ProtectedRoute).

### Задачи
Создание с названием, описанием, приоритетом (1-3), сроком (дата + время). Канбан-доска с drag-n-drop между статусами. Список с сортировкой (по дате, приоритету, алфавиту). Фильтры: поиск, статусы, приоритеты, диапазон дат, тип задачи (разовая / повторяющаяся), просрочено, ближайшие сроки. Управление статусами (создание, редактирование, цвета, порядок, финальный статус). Детальный экран /tasks/:id. Просроченные сроки подсвечиваются красным.

### Повторяющиеся задачи
Типы повторения: ежедневно, еженедельно, ежемесячно. Одно время в сутки (локальное время, хранится в UTC). Генерация вхождений (occurrences) на 7 дней вперёд. Система подтверждений: пользователь подтверждает каждое наступившее вхождение через модалку «Подтверждения» с двумя вкладками (не подтверждённые / подтверждённые), фильтром по датам и чекбоксами. Бейджи на карточках и в rail модалки показывают количество наступивших неподтверждённых вхождений. Лимит хранения: 100 вхождений на задачу, более старые удаляются автоматически.

### Уведомления (Web Push)
Работают для разовых и повторяющихся задач. Сценарии: за 5 минут до срока, в момент срока, через час после срока (просрочено), за 24 часа до срока. На Desktop (Chrome/Edge/Firefox) и Android (Chrome/Firefox) — с action-кнопкой «Подтвердить» прямо в уведомлении. На iOS (Safari, iOS 16.4+, только PWA-режим) — без кнопок, тап открывает приложение. Настройки уведомлений в профиле: мастер-выключатель, отдельные тумблеры для каждого типа, тихие часы, дайджест. Учёт тихих часов и пер-задачного флага notifications.enabled.

### База знаний
Создание статей (заголовок + содержимое). Редактирование (inline в модалке и в детальном экране). Удаление с подтверждением. Детальный экран /knowledge/:id. Фильтры: поиск, диапазон дат, сортировка.

### Глобальный поиск
Command palette (кнопка «Поиск» в шапке). Результаты в блоках «Задачи» и «Статьи» с общим счётчиком. «Показать ещё» и «Открыть в разделе». Открытие деталей внутри панели без закрытия.

### Дашборд
Быстрые действия (+ Задача, + Статья). Плашки по статусам (цвет + имя + число). Блок «Просрочено» с агрегацией по задачам (одна строка на задачу, «+ ещё N» для повторяющихся). Блок «Ближайшие сроки» (3 дня) с той же агрегацией. Последние задачи (5 шт., по updatedAt). Последние статьи (5 шт., по createdAt). Пустое состояние.

### Профиль
Кружок с аватаром в шапке. Модалка с внутренними экранами: profile / settings / notifications. В profile: аватар, имя, email, кнопки «Настройки» и «Выйти». В settings: список разделов. В notifications: настройки push-подписок (включить/отключить на этом устройстве, тестовое уведомление) и глобальные настройки уведомлений.

### PWA
Манифест с иконками (favicon-96x96, logo192, logo512, apple-touch-icon). Service Worker для Web Push. Устанавливается на домашний экран Android и iOS. На iOS Web Push работает только в PWA-режиме.

### Навигация
Иерархическая: стрелка в шапке ведёт на уровень вверх. Разделы: Главная, Мои задачи, База знаний, Поиск (command palette), Профиль.

## Технологии

### Backend
Node.js 20, Express 4. MongoDB 7 + Mongoose 7. JWT (jsonwebtoken), bcryptjs. express-validator, helmet, express-rate-limit. Agenda 5 (планировщик задач). web-push 3 (отправка пушей).

### Frontend
React 18, TypeScript 4.9. Create React App 5. react-router-dom 6. axios (централизованный клиент с interceptor). @dnd-kit/core, @dnd-kit/sortable (канбан). CSS-переменные (без UI-библиотек). Service Worker + Push API.

### Инфраструктура
Docker + Docker Compose. MongoDB 7.0 в контейнере с named volume mongo_data. Три сервиса: backend, frontend, mongo.

## Архитектура

backend/
  src/
    controllers/   authController, taskController, articleController, statusController, dashboardController, occurrenceController, pushController, userController
    models/        User, Task, Article, Status, Occurrence, PushSubscription
    routes/        auth, tasks, articles, statuses, search, dashboard, occurrences, push, users
    middleware/    auth (JWT), errorHandler
    utils/         recurrence, webPush, defaultStatuses
    agenda.js      планировщик (генерация occurrences, отправка пушей, очистка)
  server.js
  .env.example
  Dockerfile
  package.json

frontend/
  public/
    index.html
    manifest.json
    service-worker.js
    favicon-96x96.png, logo192.png, logo512.png, apple-touch-icon.png, favicon.svg, favicon.ico, site.webmanifest
  src/
    components/    Layout, Login, Register, Dashboard, Tasks, TaskDetail, TaskModal, TaskModalContent, TaskModalRail, TaskModalRail, OccurrenceConfirmModal, RecurrencePicker, ClearableField, ClearableInput, Knowledge, ArticleDetail, ArticleModal, ArticleModalContent, ArticleModalRail, FilterBar, ArticleFilterBar, KanbanBoard, StatusManager, SearchModal, Modal, MultiSelect, ProfileModal, ConfirmDialog, ConfirmProvider, ProtectedRoute
    hooks/         useMediaQuery, useTaskDetail, useArticleDetail, useOccurrences
    utils/         token, api, priority, status, sort, date, recurrence, push
    serviceWorkerRegistration.ts
    App.tsx, index.tsx
    index.css, App.css
  .env.example
  Dockerfile
  package.json

docker-compose.yml
README.md
PROJECT_PLAN.md

## API

Все эндпоинты возвращают { success: true, ... } или { success: false, message }.

### Auth
POST /api/auth/register — регистрация, возвращает JWT + user
POST /api/auth/login — вход, возвращает JWT + user

### Statuses (требуют JWT)
GET /api/statuses — список статусов
POST /api/statuses — создание
PUT /api/statuses/reorder — переупорядочивание
PUT /api/statuses/:id — обновление
DELETE /api/statuses/:id — удаление (если нет задач)

### Tasks (требуют JWT)
GET /api/tasks — список задач (фильтры: q, statusIds, priority, dateFrom, dateTo, sort, taskType, overdue, dueSoon)
POST /api/tasks — создание
GET /api/tasks/:id — одна задача
PUT /api/tasks/:id — обновление
DELETE /api/tasks/:id — удаление
PUT /api/tasks/reorder — переупорядочивание

### Occurrences (требуют JWT)
GET /api/occurrences/pending — только наступившие (dueAt <= now) вхождения пользователя
GET /api/occurrences/by-task/:taskId?status=pending|done — вхождения для задачи
GET /api/occurrences/:id — одно вхождение
PUT /api/occurrences/confirm — пакетное подтверждение { ids: [...] }
PUT /api/occurrences/unconfirm — пакетная отмена подтверждения { ids: [...] }

### Push (требуют JWT)
GET /api/push/vapid-public-key — публичный VAPID-ключ
POST /api/push/subscribe — сохранить push-подписку
DELETE /api/push/unsubscribe — удалить подписку
GET /api/push/subscriptions — список подписок пользователя
POST /api/push/test — тестовое уведомление

### Users (требуют JWT)
GET /api/users/me — текущий пользователь
PUT /api/users/notification-settings — обновление настроек уведомлений
PUT /api/users/avatar — обновление аватара

### Articles (требуют JWT)
GET /api/articles — список статей (фильтры: q, dateFrom, dateTo, sort)
POST /api/articles — создание
GET /api/articles/:id — одна статья
PUT /api/articles/:id — обновление
DELETE /api/articles/:id — удаление

### Search (требует JWT)
GET /api/search?q=<query> — поиск по задачам и статьям

### Dashboard (требует JWT)
GET /api/dashboard — агрегированные данные (включая просроченные и ближайшие сроки с учётом повторяющихся задач)

## Модели данных

User: _id, username (unique), email (unique, lowercase), password (bcrypt), avatar, notificationSettings (enabled, beforeDue, atDue, overdueReminder, dailyDigest, dailyDigestTime, quietHours), createdAt, updatedAt

Status: _id, userId (ref User), name, color (hex), order, isFinal (Boolean), createdAt, updatedAt

Task: _id, userId (ref User), title, description, statusId (ref Status), priority (1-3), order, dueDate (Date, UTC), recurrence (type, time, dayOfWeek, dayOfMonth), notifications (enabled), notificationsSent (dayBefore, beforeDue, atDue, overdue), createdAt, updatedAt

Occurrence: _id, taskId (ref Task), userId (ref User), dueAt (Date, UTC), status (pending|done), confirmedAt, notificationsSent (dayBefore, beforeDue, atDue, overdue), createdAt, updatedAt

PushSubscription: _id, userId (ref User), endpoint (unique), keys (p256dh, auth), userAgent, createdAt, updatedAt

Article: _id, userId (ref User), title, content, createdAt, updatedAt

## Запуск

Требуется Docker и Docker Compose.

1. Скопировать env-примеры.

Windows (cmd):
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

Linux / macOS:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

2. Сгенерировать VAPID-ключи для Web Push (если ещё не):
npx web-push generate-vapid-keys

Вставить ключи в backend/.env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (в формате mailto:your@email.com).

3. Собрать и запустить:
docker-compose up --build

Frontend: http://localhost:3000
Backend: http://localhost:5000
MongoDB: localhost:27017 (порт открыт для Compass/mongosh)

## Переменные окружения

### backend/.env
MONGODB_URI=mongodb://mongo:27017/worklist
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
VAPID_PUBLIC_KEY=<ваш_публичный_ключ>
VAPID_PRIVATE_KEY=<ваш_приватный_ключ>
VAPID_SUBJECT=mailto:your@email.com

### frontend/.env
REACT_APP_API_URL=http://localhost:5000
HOST=0.0.0.0
PORT=3000
DANGEROUSLY_DISABLE_HOST_CHECK=true
REACT_APP_ENABLE_SW=true

## Разработка

Изменения в backend/ и frontend/ монтируются в контейнеры через volume — nodemon и CRA hot-reload работают автоматически.
Логи: docker-compose logs -f backend и docker-compose logs -f frontend.
Пересборка: docker-compose up --build.
Остановка: docker-compose down (без -v, чтобы не потерять данные).

## В планах

### Функционал
Связи между задачами и статьями (привязка статьи к задаче). Файлы и таблицы в статьях (Markdown). Кнопка «Прекратить повторение» в rail модалки задачи.

### UX
Тёмная тема (переключатель + сохранение в localStorage). Иконки (lucide-react вместо эмодзи). Адаптив под мобильные (полировка).

### Перспективное
Синхронизация в реальном времени (WebSocket). Чат-бот / Ассистент (текстовые и голосовые команды). i18n (переключение RU/EN). Экспорт данных.

### Технический долг
Миграция с CRA 5 на Vite. Ограничить CORS для продакшена. Вынести VAPID-ключи из .env.example (оставить только заглушки).

## Лицензия

MIT