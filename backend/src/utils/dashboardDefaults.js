// Дефолтные настройки дашборда — единый источник (бэк отдаёт фронту).
// blocks: id блока, видимость, порядок, выбранные статусы (по системному key).
const DEFAULT_DASHBOARD = {
  upcomingDays: 3,
  blocks: [
    { id: 'byStatus', visible: true, order: 0, statusKeys: ['pending', 'in_progress'] },
    { id: 'overdue', visible: true, order: 1, statusKeys: [] },
    { id: 'upcoming', visible: true, order: 2, statusKeys: [] },
    { id: 'recentTasks', visible: false, order: 3, statusKeys: [] },
    { id: 'recentArticles', visible: false, order: 4, statusKeys: [] }
  ]
};

module.exports = DEFAULT_DASHBOARD;
