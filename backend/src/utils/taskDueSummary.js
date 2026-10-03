// R1 шаг 1 (уровень 2): сводка сроков ПО ЗАДАЧЕ.
// Agenda использует getDueItems (плоский список вхождений).
// Dashboard и getTasks используют агрегаты по задаче — этот модуль.
// Убирает дублирование 4 агрегаций (2 в dashboard, 2 в getTasks).

const Occurrence = require('../models/Occurrence');

/**
 * Сводка по повторяющимся задачам: pendingCount, lastOverdueAt, nextDueAt.
 * @param {ObjectId} userId
 * @param {ObjectId[]} taskIds
 * @returns {Promise<Map<string,{count:number,lastAt:Date|null,nextAt:Date|null}>>}
 */
async function summarizeOccurrences(userId, taskIds) {
  const map = new Map();
  if (!taskIds || taskIds.length === 0) return map;

  const now = new Date();

  // Просроченные неподтверждённые: count + самая свежая
  const overdueAgg = await Occurrence.aggregate([
    { $match: { userId, taskId: { $in: taskIds }, status: 'pending', dueAt: { $lt: now } } },
    { $group: { _id: '$taskId', count: { $sum: 1 }, lastAt: { $max: '$dueAt' } } }
  ]);
  overdueAgg.forEach((o) => map.set(String(o._id), { count: o.count, lastAt: o.lastAt, nextAt: null }));

  // Ближайшая будущая неподтверждённая
  const nextAgg = await Occurrence.aggregate([
    { $match: { userId, taskId: { $in: taskIds }, status: 'pending', dueAt: { $gte: now } } },
    { $group: { _id: '$taskId', nextAt: { $min: '$dueAt' } } }
  ]);
  nextAgg.forEach((o) => {
    const cur = map.get(String(o._id)) || { count: 0, lastAt: null };
    cur.nextAt = o.nextAt;
    map.set(String(o._id), cur);
  });

  return map;
}

/**
 * Обогатить задачу сроковыми полями (единый смысл для list/dashboard/календаря).
 * @param {object} task  lean-объект или toObject()
 * @param {Map} summary результат summarizeOccurrences
 */
function enrichTaskDue(task, summary) {
  const isRec = !!(task.recurrence && task.recurrence.type);
  if (isRec) {
    const info = summary.get(String(task._id));
    task.pendingOccurrenceCount = info ? info.count : 0;
    task.nextOccurrenceDueAt = (info && info.nextAt) || (info && info.lastAt) || null;
    task.lastOverdueAt = (info && info.lastAt) || null;
  } else {
    task.pendingOccurrenceCount = 0;
    task.nextOccurrenceDueAt = task.dueDate || null;
    task.lastOverdueAt = null;
  }
  return task;
}

/**
 * Агрегат повторяющихся задач по дате (для фильтров overdue/dueSoon и dashboard).
 * @param {ObjectId} userId
 * @param {object} dateCondition  { $lt: now } или { $gte, $lte }
 * @param {'max'|'min'} direction — какую дату брать (свежая/ближайшая)
 * @returns {Promise<Map<string,Date>>} taskId → date
 */
async function aggregateOccurrenceDates(userId, dateCondition, direction) {
  const acc = direction === 'max' ? { $max: '$dueAt' } : { $min: '$dueAt' };
  const agg = await Occurrence.aggregate([
    { $match: { userId, status: 'pending', dueAt: dateCondition } },
    { $group: { _id: '$taskId', dateAt: acc } }
  ]);
  const map = new Map();
  agg.forEach((o) => map.set(String(o._id), o.dateAt));
  return map;
}

/**
 * Дата (max/min) + count за один проход — для dashboard (просрочено/ближайшие).
 * @returns {Promise<Map<string,{dateAt:Date,count:number}>>}
 */
async function aggregateOccurrenceSummary(userId, dateCondition, direction) {
  const acc = direction === 'max' ? { $max: '$dueAt' } : { $min: '$dueAt' };
  const agg = await Occurrence.aggregate([
    { $match: { userId, status: 'pending', dueAt: dateCondition } },
    { $group: { _id: '$taskId', dateAt: acc, count: { $sum: 1 } } }
  ]);
  const map = new Map();
  agg.forEach((o) => map.set(String(o._id), { dateAt: o.dateAt, count: o.count }));
  return map;
}

module.exports = { summarizeOccurrences, enrichTaskDue, aggregateOccurrenceDates, aggregateOccurrenceSummary };
