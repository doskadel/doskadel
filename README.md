# WorkList

Кроссплатформенное приложение для управления задачами и ведения дневника с синхронизацией данных между устройствами через аккаунт.

## Текущий статус

MVP работает: регистрация, логин, CRUD задач и дневника, поиск, детальные экраны, иерархическая навигация.

## Что уже реализовано

### Аутентификация
- Регистрация с валидацией (username 3-30, email, password min 6)
- Логин по email + пароль (bcrypt)
- JWT-сессии (24 часа)
- «Запомнить меня» — localStorage (долгая сессия) / sessionStorage (до закрытия вкладки)
- Защищённые маршруты (ProtectedRoute)

### Задачи
- Создание с названием, описанием, статусом, приоритетом (1-5)
- Редактирование (inline в списке и в детальном экране)
- Удаление с подтверждением
- Детальный экран: /tasks/:id — все поля, смена статуса в один клик, даты создания/обновления

### Дневник
- Создание записей (заголовок + содержимое)
- Редактирование (inline в списке и в детальном экране)
- Удаление с подтверждением
- Детальный экран: /diary/:id — полный текст, даты

### Поиск
- Полнотекстовый поиск по задачам (title, description) и дневнику (title, content)
- Case-insensitive (regex на backend)

### Навигация
- Иерархическая: стрелка в шапке ведёт на уровень вверх (не по истории браузера)
- Уровень 1: / (дашборд) — без стрелки
- Уровень 2: /tasks, /diary, /search — стрелка на /
- Уровень 3: /tasks/:id, /diary/:id — стрелка на /tasks или /diary
- Кликабельные карточки в списках

## Технологии

### Backend
- Node.js 20
- Express 4
- MongoDB 7 + Mongoose 7
- JWT (jsonwebtoken)
- bcryptjs
- express-validator
- helmet
- express-rate-limit

### Frontend
- React 18
- TypeScript 4.9
- Create React App 5
- react-router-dom 6
- axios (централизованный клиент с interceptor)
- CSS-переменные (без UI-библиотек в использовании)

### Инфраструктура
- Docker + Docker Compose
- MongoDB в контейнере с named volume mongo_data

## Архитектура

worklist/
├── backend/
│   ├── src/
│   │   ├── controllers/   # authController, taskController, diaryController
│   │   ├── models/        # User, Task, DiaryEntry
│   │   ├── routes/        # auth, tasks, diary, search
│   │   └── middleware/    # auth (JWT), errorHandler
│   ├── server.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Layout, Login, Register, Dashboard, Tasks, TaskDetail, Diary, DiaryDetail, Search, ProtectedRoute
│   │   ├── utils/         # token.ts, api.ts
│   │   ├── App.tsx, index.tsx
│   │   └── index.css, App.css
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md

## API

Все эндпоинты возвращают { success: true, ... } или { success: false, message }.

### Auth
- POST /api/auth/register — регистрация, возвращает JWT + user
- POST /api/auth/login — вход, возвращает JWT + user

### Tasks (требуют JWT)
- GET /api/tasks — список задач текущего пользователя
- POST /api/tasks — создание
- GET /api/tasks/:id — одна задача
- PUT /api/tasks/:id — обновление
- DELETE /api/tasks/:id — удаление

### Diary (требуют JWT)
- GET /api/diary — список записей
- POST /api/diary — создание
- GET /api/diary/:id — одна запись
- PUT /api/diary/:id — обновление
- DELETE /api/diary/:id — удаление

### Search (требует JWT)
- GET /api/search?q=<query> — поиск по задачам и дневнику

## Модели данных

**User:** _id, username (unique), email (unique, lowercase), password (bcrypt), createdAt, updatedAt

**Task:** _id, userId (ref User), title, description, status (pending|in_progress|completed|cancelled), priority (1-5), dueDate?, createdAt, updatedAt

**DiaryEntry:** _id, userId (ref User), title, content, createdAt, updatedAt

## Запуск

Требуется Docker и Docker Compose.

1. Скопировать env-примеры: cp backend/.env.example backend/.env
2. Собрать и запустить: docker-compose up --build

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

- Изменения в backend/ и frontend/ монтируются в контейнеры через volume — nodemon и CRA hot-reload работают автоматически.
- Логи: docker-compose logs -f backend и docker-compose logs -f frontend.
- Пересборка: docker-compose up --build.
- Остановка: docker-compose down (без -v, чтобы не потерять данные).

## В планах

### Функционал
- Канбан-доска для задач (drag-n-drop между статусами)
- Глобальный поиск (иконка в шапке + dropdown с совпадениями)
- Локальный поиск на экранах задач и дневника
- Дашборд с агрегацией: количество задач по статусам, ближайшие дедлайны, последние записи
- Связи между задачами и записями дневника
- Напоминания и дедлайны

### UX
- Свой ConfirmDialog вместо системного window.confirm
- Тёмная тема (переключатель + сохранение в localStorage)
- Иконки (lucide-react)
- Цветные бейджи статусов
- Приоритет словами («Низкий / Средний / Высокий»)
- Адаптив под мобильные

### Перспективное
- Синхронизация в реальном времени (WebSocket)
- Чат-бот (текстовые и голосовые команды)
- PWA / Capacitor для мобильной версии
- i18n (переключение RU/EN)
- Экспорт данных

### Технический долг
- Миграция с CRA 5 на Vite
- Хардкод http://localhost:5000 → переменная через API_BASE_URL (частично сделано в utils/api.ts)
- Ограничить CORS для продакшена
- Файлы favicon.ico, logo192.png, logo512.png отсутствуют в public/, но упомянуты в manifest.json

## Лицензия

MIT