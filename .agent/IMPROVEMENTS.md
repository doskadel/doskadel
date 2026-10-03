# IMPROVEMENTS: DoskaDel

Реестр предложений (ярус 1). Статусы: proposed / approved / in-progress / done / rejected. Решает оператор. При работе над пунктом менять статус здесь.
Обновлено 2026-10-03 (вечер): добавлены S1-S4 (безопасность), F1-F3 (функционал), X1-X4 (документация); уточнены O6 и A3. Новые пункты получены чтением кода, не запуском: перед правкой перепроверять по реальному коду.

## Архитектура (добавлено 2026-10-03, приоритет перед F1/D1/D5)
- R1 done (ядро, 2026-10-03). Единые условия (taskKinds), единая абстракция сроков: dueItems (agenda, список вхождений) + taskDueSummary (getTasks/dashboard, сводка по задаче). agenda: 10 job -> 6. Фронт Tasks.tsx: убран дубль подсчёта pendingOccurrenceCount. Календарь (F1) теперь строится на готовой абстракции. Осиротевший /api/occurrences/pending удалён (df2e09e). Разделение разовых и повторяющихся: в UI плюс, в хранении минус (две модели: Task.dueDate vs Occurrence; дубли логики в agenda/dashboard/getTasks/календаре; два смысла «выполнено»; хрупкие условия recurrence:null vs $exists:false). План: (1) единая функция «список сроков» (taskId, dueAt, kind: single|occurrence) для dashboard/getTasks/календаря/agenda; (2) параметризовать job в agenda (4 вместо 8); (3) единое условие «разовая» ($exists:false) везде. Модель НЕ переписывать сейчас. Делать ДО F1 (календарь) и D1/D5, иначе баги класса календаря повторятся.

## Оптимизация
- O1 proposed. Ленивая загрузка маршрутов (React.lazy + Suspense): Tasks, Knowledge, CalendarView, ProfileModal, SearchModal. В src нет lazy/Suspense, всё грузится одним бандлом.
- O2 proposed. .lean() в read-запросах бэка (в backend/src не найдено ни одного).
- O3 частично done (2026-10-03). Task-индексы были (userId+statusId+order, userId+recurrence.type, userId+dueDate). Добавлены Article (userId+createdAt, userId+title). Text-индекс ОТЛОЖЕН: $regex его не использует, нужен переход на $text (отдельная задача). (сначала проверить имя поля срока и запросы дашборда), text-индекс для поиска статей. У Occurrence индексы есть.
- O4 proposed. Удалить мёртвые зависимости @mui/material и @emotion/* (не используются в src).
- O5 proposed. Тесты (jest + supertest на бэке): порог «Ближайшие», refresh-токены, проверка владельца.
- O6 proposed. dump.txt и dump.bat лежат в корне. В .gitignore они уже есть, по git ls-files не отслеживаются, PROJECT.md и BUGS.md (B2) по этому пункту устарели. Сделать: проверить git ls-files dump.txt, при необходимости git rm --cached; убрать с диска или перенести в scripts/; поправить PROJECT.md и закрыть B2 (см. X3).

## Дизайн-система и цвет
- D1 proposed. Заменить 19 hex-цветов и россыпь rgba в index.css токенами, общие --shadow-sm/md/lg. Без этого тёмная тема будет неровной.
- D2 done (базово, 2026-10-03). Палитра в tokens.css, контраст проверен: все пары ≥5.19 (AA 4.5 пройден, light+dark). Radix Colors (MIT, пары light/dark) или палитра Tailwind. Один акцент, нейтральные серые, семантические success/warning/danger. Контраст текста не ниже AA 4.5:1.
- D3 done (базово, 2026-10-03). Тёмная тема: не чёрный (#14171a), слои surface/surface-alt, акцент менее насыщенный (#4c9aff). не чистый чёрный, слои поверхностей, менее насыщенный акцент.
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
- A1 done (2026-10-03). Глобальный :focus-visible (2px primary, offset 2), мышь не подсвечивается. (сейчас найден только в двух правилах).
- A2 proposed. Цель нажатия не меньше 44px у всех иконок-кнопок.
- A3 check. CalendarView: ячейки дней это button (ок), а задачи дня это div role=button с tabIndex и обработчиком только Enter, без Space. То же в Dashboard (dashboard-item), Tasks (task-card) и Knowledge (article-card): везде только Enter. Сделать общий хелпер или заменить на button/a.
- A4 check. prefers-reduced-motion не проверен.

## Безопасность и надёжность
- S1 done (2026-10-03). Единый config.JWT_SECRET, падение в проде, запасное убрано. Расхождение JWT_SECRET: backend/src/middleware/auth.js проверяет токен через process.env.JWT_SECRET без запасного значения, а authController.js подписывает с запасным 'doskadel_secret'. Если переменная не задана: вход и регистрация проходят, но все защищённые запросы получают 401 (jwt.verify без секрета). Сделать: единый модуль конфига, при старте падать с понятной ошибкой, если JWT_SECRET не задан (особенно при NODE_ENV=production), убрать запасное значение.
- S2 done (2026-10-03). escapeRegex (лимит 200) в search.js, taskController, articleController. Проверено: поиск с '(' -> 200. Поиск строит регулярку из пользовательского ввода без экранирования: taskController.getTasks (new RegExp(q)), articleController.getArticles (new RegExp(q)), routes/search.js ($regex: q). Запрос вроде «(» даёт 500, тяжёлая регулярка грузит сервер (ReDoS). Сделать: общий хелпер escapeRegex(q) в utils, ограничение длины q, применить во всех трёх местах. Дальше, после O3: text-индекс Mongo.
- S3 done (2026-10-03). console.error в catch search.js. нет валидации q, в catch нет console.error (500 без следа в логах). Добавить логирование и валидацию.
- S4 done (2026-10-03). Белый список полей в create/update task и article. передают req.body в findOneAndUpdate целиком: можно изменить userId, notificationsSent и другие служебные поля. createTask делает ...req.body (userId затирается сервером, но order, notificationsSent задать можно). Сделать белый список полей. Связано с единым слоем доступа из decisions.md (workspaceId).

## Функционал
- F1 proposed. Календарь (CalendarView.tsx): только месяц. По решению арбитра в скоуп входят месяц, неделя, день и drag&drop дедлайнов, без внешних календарей. Дата берётся из nextOccurrenceDueAt или dueDate, повторяющиеся задачи показываются одной точкой.
- F2 proposed. Кнопка бота в нижнем баре (Layout.tsx) открывает SearchModal. Либо заглушка «Помощник скоро» с честным текстом, либо оставить поиск, но сменить title и иконку, чтобы не вводить в заблуждение. Реальный бот последним.
- F3 proposed. Профиль сейчас модалка (ProfileModal). По PLAN приоритет 4: отдельный раздел /profile, объединить с настройками и переключателем темы.

## Исправленные баги (добавлено 2026-10-03)
- X5 done. Календарь: повторяющаяся задача с неподтверждённой просрочкой не показывала красную метку в день последней просрочки (задача попадала только в день nextOccurrenceDueAt). Фикс: tasksByDay включает повторяющихся с lastOverdueAt в день последней просрочки, и не дублирует в день будущей итерации. Бэк отдаёт lastOverdueAt.

## Документация, устарела относительно кода
- X1 done (2026-10-03). README: auth (access 15м + refresh cookie), API (refresh/logout/settings), env (убран JWT_EXPIRES_IN). PROJECT_PLAN — только «JWT для аутентификации» (общее, не критично). описывают JWT на 24 часа. Фактически: access 15 минут, refresh в httpOnly cookie с ротацией и reuse-detection, есть /api/auth/refresh, /api/auth/logout, /api/settings/dashboard, модель RefreshToken, Status.key, User.dashboardSettings. Обновить разделы Аутентификация, API, Модели, Архитектура.
- X2 done (2026-10-03). BUGS: B1/B6 помечены закрытыми. B5 (CORS origin:true) остаётся — ограничить для прода (см. B5). B1 закрыт (refresh реализован), B6 закрыт (api.ts на относительном /api, setupProxy.js), в frontend/.env.example остался неиспользуемый REACT_APP_API_URL. B5 (CORS) не закрыт: server.js ставит cors({ origin: true, credentials: true }), то есть любой origin с куками. Для прода ограничить; при схеме «один домен + reverse-proxy» CORS можно убрать.
- X3 done (2026-10-03). PROJECT.md: dump.txt исправлен (в .gitignore), добавлены S1/S2 в риски (исправлены). в git неверен (см. O6). Также в разделе Риски добавить S1 и S2.
- X4 done (2026-10-03). VAPID-ключи и email заменены заглушками; СТАРЫЕ КЛЮЧИ В GIT-ИСТОРИИ — оператору перевыпустить, если использовались в проде. содержит VAPID-ключи, похожие на настоящие, и реальный email. Заменить заглушками, а ключи перевыпустить, если они использовались в проде (они в истории git).

## Предлагаемый порядок
0) безопасность и документы: S1, S2, S4, X1-X4 (быстро, снижают риск, дизайн не трогают); 1) токены вместо hex, тени, радиусы (D1, D5); 2) палитра и тёмная тема (D2, D3); 3) кнопки и чипы (D6, D7); 4) шрифт (D4); 5) lazy, lean, индексы (O1-O3); 6) календарь и профиль (F1, F3), пустые состояния, скелетоны (D9); 7) тесты (O5). F2 решается при редизайне нижнего бара, бот последним.
