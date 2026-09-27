# WorkList - План реализации проекта

## 1. Общая архитектура

### 1.1 Микросервисная архитектура
- Backend сервис (Node.js + Express)
- Frontend сервис (React + TypeScript)
- Database (MongoDB)
- Docker контейнеры для каждого компонента

### 1.2 Функциональные модули
1. **Аутентификация и авторизация** — ✅ реализовано
2. **Управление задачами** (канбан + список, статусы, приоритеты) — ✅ реализовано
3. **База знаний** (статьи, фильтры, поиск) — ✅ реализовано
4. **Поиск и фильтрация** — ✅ реализовано
5. **Дашборд с агрегацией** — ✅ реализовано
6. **Синхронизация данных** — ⏳ в планах
7. **Чат-бот (текстовые и голосовые команды)** — ⏳ в планах

## 2. Backend реализация

### 2.1 Технологии
- Node.js 20 с Express.js
- MongoDB 7 с Mongoose 7
- JWT для аутентификации
- Docker для контейнеризации

### 2.2 API endpoints

**Auth**
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход

**Statuses (требуют JWT)**
- `GET /api/statuses` — все статусы пользователя
- `POST /api/statuses` — создание
- `PUT /api/statuses/reorder` — переупорядочивание
- `PUT /api/statuses/:id` — обновление
- `DELETE /api/statuses/:id` — удаление

**Tasks (требуют JWT)**
- `GET /api/tasks` — список задач
- `POST /api/tasks` — создание
- `GET /api/tasks/:id` — одна задача
- `PUT /api/tasks/:id` — обновление
- `DELETE /api/tasks/:id` — удаление
- `PUT /api/tasks/reorder` — переупорядочивание

**Articles (требуют JWT)**
- `GET /api/articles` — список статей
- `POST /api/articles` — создание
- `GET /api/articles/:id` — одна статья
- `PUT /api/articles/:id` — обновление
- `DELETE /api/articles/:id` — удаление

**Search (требует JWT)**
- `GET /api/search?q=<query>` — поиск по задачам и статьям

**Dashboard (требует JWT)**
- `GET /api/dashboard` — агрегированные данные

### 2.3 Структура данных

**User:** _id, username (unique), email (unique, lowercase), password (bcrypt), createdAt, updatedAt

**Status:** _id, userId (ref User), name, color (hex), order, createdAt, updatedAt

**Task:** _id, userId (ref User), title, description, statusId (ref Status), priority (1-3), order, dueDate?, createdAt, updatedAt

**Article:** _id, userId (ref User), title, content, createdAt, updatedAt

## 3. Frontend реализация

### 3.1 Технологии
- React 18 с TypeScript 4.9
- Create React App 5
- react-router-dom 6
- axios (централизованный клиент с interceptor)
- CSS-переменные (без UI-библиотек)
- @dnd-kit (drag-n-drop для канбана)

### 3.2 Основные компоненты
- **Auth:** Login, Register
- **Layout:** шапка с навигацией (Главная, Мои задачи, База знаний, Поиск)
- **Dashboard:** счётчики, плашки по статусам, последние задачи, последние статьи
- **Tasks:** канбан + список, фильтры в поповерах, StatusManager, TaskModal, TaskDetail
- **Knowledge:** сетка статей, ArticleModal, ArticleDetail
- **Search:** глобальный поиск по задачам и статьям

### 3.3 Структура приложения

worklist/
├── .gitignore
├── PROJECT_PLAN.md
├── README.md
├── docker-compose.yml
├── package.json
│
├── backend/
│ ├── .env.example
│ ├── Dockerfile
│ ├── package.json
│ ├── server.js
│ └── src/
│ ├── controllers/
│ │ ├── articleController.js
│ │ ├── authController.js
│ │ ├── dashboardController.js
│ │ ├── statusController.js
│ │ └── taskController.js
│ ├── middleware/
│ │ ├── auth.js
│ │ └── errorHandler.js
│ ├── models/
│ │ ├── Article.js
│ │ ├── Status.js
│ │ ├── Task.js
│ │ └── User.js
│ ├── routes/
│ │ ├── articles.js
│ │ ├── auth.js
│ │ ├── dashboard.js
│ │ ├── search.js
│ │ ├── statuses.js
│ │ └── tasks.js
│ └── utils/
│ └── defaultStatuses.js
│
└── frontend/
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
├── public/
│ ├── index.html
│ └── manifest.json
└── src/
├── App.css
├── App.tsx
├── index.css
├── index.tsx
├── components/
│ ├── ArticleDetail.tsx
│ ├── ArticleFilterBar.tsx
│ ├── ArticleModal.tsx
│ ├── Dashboard.tsx
│ ├── FilterBar.tsx
│ ├── KanbanBoard.tsx
│ ├── Knowledge.tsx
│ ├── Layout.tsx
│ ├── Login.tsx
│ ├── Modal.tsx
│ ├── MultiSelect.tsx
│ ├── ProtectedRoute.tsx
│ ├── Register.tsx
│ ├── Search.tsx
│ ├── StatusManager.tsx
│ ├── TaskDetail.tsx
│ ├── TaskModal.tsx
│ └── Tasks.tsx
├── hooks/
│ └── useMediaQuery.ts
└── utils/
├── api.ts
├── priority.ts
├── sort.ts
├── status.ts
└── token.ts



## 4. Docker конфигурация

- `docker-compose.yml` — три сервиса: backend, frontend, mongo
- MongoDB 7.0 с named volume `mongo_data` и healthcheck
- Backend и frontend монтируются через volume (hot-reload)

## 5. Этапы реализации

- ✅ Этап 1: Подготовка и базовая структура
- ✅ Этап 2: Аутентификация и базовые API
- ✅ Этап 3: Поиск и фильтрация
- ✅ Этап 4: Канбан и статусы
- ✅ Этап 5: Дашборд с агрегацией
- ✅ Этап 6: База знаний (статьи)
- ⏳ Этап 7: Синхронизация данных
- ⏳ Этап 8: Чат-бот

## 6. В планах

### Функционал
- Глобальный поиск в шапке (иконка + dropdown)
- Связи между задачами и статьями
- Напоминания и дедлайны (dueDate в UI)
- Файлы и таблицы в статьях (Markdown)

### UX
- Свой ConfirmDialog вместо `window.confirm`
- Тёмная тема
- Иконки (lucide-react)
- Адаптив под мобильные

### Перспективное
- Синхронизация в реальном времени (WebSocket)
- Чат-бот (текстовые и голосовые команды)
- PWA / Capacitor
- i18n (RU/EN)
- Экспорт данных

### Технический долг
- Миграция с CRA 5 на Vite
- Ограничить CORS для продакшена
- Отсутствуют favicon.ico, logo192.png, logo512.png (упомянуты в manifest.json)