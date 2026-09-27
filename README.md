# WorkList

Кроссплатформенное приложение для управления задачами и ведения базы знаний с синхронизацией данных между устройствами через аккаунт.

## Текущий статус

MVP работает: регистрация, логин, CRUD задач (канбан + список), CRUD статей, статусы, поиск, дашборд, иерархическая навигация.

## Что уже реализовано

### Аутентификация
- Регистрация с валидацией (username 3-30, email, password min 6)
- Логин по email + пароль (bcrypt)
- JWT-сессии (24 часа)
- Защищённые маршруты (ProtectedRoute)

### Задачи
- Создание с названием, описанием, приоритетом (1-3)
- Канбан-доска с drag-n-drop между статусами
- Список с сортировкой (по дате, приоритету, алфавиту)
- Фильтры: поиск, статусы, приоритеты, диапазон дат
- Управление статусами (создание, редактирование, цвета, порядок)
- Детальный экран: /tasks/:id

### База знаний
- Создание статей (заголовок + содержимое)
- Редактирование (inline в модалке и в детальном экране)
- Удаление с подтверждением
- Детальный экран: /knowledge/:id — полный текст, даты
- Фильтры: поиск, диапазон дат, сортировка

### Дашборд
- Счётчики задач и статей
- Плашки по статусам (цвет + имя + число)
- Последние задачи (5 шт., по updatedAt)
- Последние статьи (5 шт., по createdAt)

### Поиск
- Полнотекстовый поиск по задачам (title, description) и статьям (title, content)
- Case-insensitive (regex на backend)
- Карточки результатов кликабельны

### Навигация
- Иерархическая: стрелка в шапке ведёт на уровень вверх
- Главная, Мои задачи, База знаний, Поиск

## Технологии

### Backend
- Node.js 20, Express 4
- MongoDB 7 + Mongoose 7
- JWT (jsonwebtoken), bcryptjs
- express-validator, helmet, express-rate-limit

### Frontend
- React 18, TypeScript 4.9
- Create React App 5
- react-router-dom 6
- axios (централизованный клиент с interceptor)
- @dnd-kit/core, @dnd-kit/sortable (для канбана)
- CSS-переменные (без UI-библиотек в использовании)

### Инфраструктура
- Docker + Docker Compose
- MongoDB 7.0 в контейнере с named volume `mongo_data`

## Архитектура
worklist/
├── backend/
│ ├── src/
│ │ ├── controllers/ # authController, taskController, articleController, statusController, dashboardController
│ │ ├── models/ # User, Task, Article, Status
│ │ ├── routes/ # auth, tasks, articles, statuses, search, dashboard
│ │ └── middleware/ # auth (JWT), errorHandler
│ ├── server.js
│ ├── .env.example
│ ├── Dockerfile
│ └── package.json
├── frontend/
│ ├── src/
│ │ ├── components/ # Layout, Login, Register, Dashboard, Tasks, TaskDetail, TaskModal, Knowledge, ArticleDetail, ArticleModal, FilterBar, ArticleFilterBar, KanbanBoard, StatusManager, Search, Modal, MultiSelect, ProtectedRoute
│ │ ├── hooks/ # useMediaQuery
│ │ ├── utils/ # token, api, priority, status, sort
│ │ ├── App.tsx, index.tsx
│ │ └── index.css, App.css
│ ├── .env.example
│ ├── Dockerfile
│ └── package.json
├── docker-compose.yml
└── README.md


## API

Все эндпоинты возвращают `{ success: true, ... }` или `{ success: false, message }`.

### Auth
- `POST /api/auth/register` — регистрация, возвращает JWT + user
- `POST /api/auth/login` — вход, возвращает JWT + user

### Statuses (требуют JWT)
- `GET /api/statuses` — список статусов
- `POST /api/statuses` — создание
- `PUT /api/statuses/reorder` — переупорядочивание
- `PUT /api/statuses/:id` — обновление
- `DELETE /api/statuses/:id` — удаление (если нет задач)

### Tasks (требуют JWT)
- `GET /api/tasks` — список задач (фильтры: `q`, `statusIds`, `priority`, `dateFrom`, `dateTo`, `sort`)
- `POST /api/tasks` — создание
- `GET /api/tasks/:id` — одна задача
- `PUT /api/tasks/:id` — обновление
- `DELETE /api/tasks/:id` — удаление
- `PUT /api/tasks/reorder` — переупорядочивание

### Articles (требуют JWT)
- `GET /api/articles` — список статей (фильтры: `q`, `dateFrom`, `dateTo`, `sort`)
- `POST /api/articles` — создание
- `GET /api/articles/:id` — одна статья
- `PUT /api/articles/:id` — обновление
- `DELETE /api/articles/:id` — удаление

### Search (требует JWT)
- `GET /api/search?q=<query>` — поиск по задачам и статьям

### Dashboard (требует JWT)
- `GET /api/dashboard` — агрегированные данные

## Модели данных

**User:** `_id`, `username` (unique), `email` (unique, lowercase), `password` (bcrypt), `createdAt`, `updatedAt`

**Status:** `_id`, `userId` (ref User), `name`, `color` (hex), `order`, `createdAt`, `updatedAt`

**Task:** `_id`, `userId` (ref User), `title`, `description`, `statusId` (ref Status), `priority` (1-3), `order`, `dueDate?`, `createdAt`, `updatedAt`

**Article:** `_id`, `userId` (ref User), `title`, `content`, `createdAt`, `updatedAt`

# Запуск

Требуется Docker и Docker Compose.

1. Скопировать env-примеры.

   **Windows (cmd):**
   ```
   copy backend\.env.example backend\.env
   copy frontend\.env.example frontend\.env
   ```

   **Linux / macOS:**
   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Собрать и запустить:
   ```
   docker-compose up --build
   ```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017 (порт открыт для Compass/mongosh)

## Переменные окружения

### backend/.env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/worklist
JWT_SECRET=change_me_in_production


### frontend/.env
REACT_APP_API_URL=http://localhost:5000
HOST=0.0.0.0
PORT=3000
DANGEROUSLY_DISABLE_HOST_CHECK=true


## Разработка

- Изменения в `backend/` и `frontend/` монтируются в контейнеры через volume — nodemon и CRA hot-reload работают автоматически.
- Логи: `docker-compose logs -f backend` и `docker-compose logs -f frontend`.
- Пересборка: `docker-compose up --build`.
- Остановка: `docker-compose down` (без `-v`, чтобы не потерять данные).

## В планах

### Функционал
- Глобальный поиск в шапке (иконка + dropdown)
- Связи между задачами и статьями (привязка статьи к задаче)
- Напоминания и дедлайны (`dueDate` в UI)
- Файлы и таблицы в статьях (Markdown)

### UX
- Свой ConfirmDialog вместо системного `window.confirm`
- Тёмная тема (переключатель + сохранение в localStorage)
- Иконки (lucide-react)
- Адаптив под мобильные

### Перспективное
- Синхронизация в реальном времени (WebSocket)
- Чат-бот (текстовые и голосовые команды)
- PWA / Capacitor для мобильной версии
- i18n (переключение RU/EN)
- Экспорт данных

### Технический долг
- Миграция с CRA 5 на Vite
- Ограничить CORS для продакшена
- Файлы `favicon.ico`, `logo192.png`, `logo512.png` отсутствуют в `public/`, но упомянуты в `manifest.json`

## Лицензия

MIT
