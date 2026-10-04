# ВОПРОСЫ к арбитру (Клоду)

Копятся, пока Claude недоступен. Отправить одним пакетом, когда вернётся.

---

## Q-доска (открыт 2026-10-04, ждёт ответа)

**Доска: доска в экране + скролл колонок, без магии calc.**

Текущее (рабочее, но магическое): `.kanban-board { height: calc(100dvh - 240px); min-height:280px; overflow-x:auto; overflow-y:hidden }`, `.kanban-column { max-height:100% }`, `.kanban-column-body { flex:1; min-height:0; overflow-y:auto }`.
Проблема: на телефоне 240px мало (шапка+тулбары+нижний бар выше) -> доска длиннее экрана.

Попытка flex-цепочки (НЕ удалась, откатил): `layout-main:has(.tasks-page--board){overflow:hidden}` + `layout-container:has(){height:100%;display:flex;flex-direction:column;min-height:0}` + `tasks-page--board{flex:1;min-height:0}` + `kanban-board{flex:1;min-height:0}`. Итог: скролл внутри столбцов ПРОПАЛ, доска всё равно больше экрана.

Структура: `.layout{height:100dvh;overflow:hidden;flex-col}` > `.layout-header` + `.layout-main{flex:1;min-height:0;overflow-y:auto;padding}` > `.layout-container{max-width:1280;margin:auto;width:100%}` > (Tasks) `div.tasks-page--board` > h2 + actions + FilterBar + `.kanban-board` > `.kanban-column` > header + `.kanban-column-body`.

**Вопрос:** точная реализация (свойства на элементы), чтобы: доска РОВНО в оставшейся высоте экрана (без calc-магии), скролл ВНУТРИ колонок (вертикаль) и по доске (горизонт), страница не скроллится. Мобилка (нижний бар fixed) и ПК. Где рвётся цепочка? Что с overflow на layout-main и padding?

---

## АРХИВ (закрытые/старые, для истории)

### Q1. Главное направление проекта
Варианты: A синхронизация, B бот, C дизайн/UX, D техдолг. Рекомендация: C+D, потом A/B.

### Q2. MUI: мёртвая зависимость
@mui/material + @emotion не используются в src. Рекомендация: выпилить.

### Q3. dump.txt в git
Дамп базы в репо. Рекомендация: убрать из git, оставить скрипт.

### Q4. Синхронизация (этап 13)
Общий бэкенд уже синхронизирует; этап 13 = realtime/offline? Уточнить.

### Q5. Порядок работ
Рекомендация: 1) переименование+B1, 2) дизайн-система+навигация, 3) темы, 4) календарь, 5) профиль, 6) бот.

### Q6. Позиционирование: личное vs команды (ключевой)
Рекомендация: личное+малые команды ядром, основа под команды (роли) без биллинга; монетизация позже.

### Q7. Схема аутентификации
Рекомендация: access+refresh (httpOnly cookie). Биометрия/WebAuthn — позже.

### Q8. Бот: что делает и как
Архитектура (LLM/RAG/голос), объём, безопасность (бот меняет данные). Открыт.
