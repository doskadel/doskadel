// R1 шаг 1 (уровень 2): сводка сроков ПО ЗАДАЧЕ.
// Agenda использует getDueItems (плоский список вхождений).
// Dashboard и getTasks используют агрегаты по задаче — этот модуль.
// Убирает дублирование 4 агрегаций (2 в dashboard, 2 в getTasks).

const Occurrence = require('../models/Occurrence');
const { getNextOccurrences } = require('./recurrence');

/**
 * Сводка по повторяющимся задачам на лету (F1c этап 2):
 * pendingCount (невыполненные просроченные), lastOverdueAt, nextDueAt.
 * Учитывает исключения: выполненные/пропущенные вхождения не считаются.
 * @param {ObjectId} workspaceId
 * @param {Array} recurringTasks — lean-задачи с recurrence.freq
 * @returns {Promise<Map<string,{count:number,lastAt:Date|null,nextAt:Date|null}>>}
 */
async function summarizeOccurrences(workspaceId, recurringTasks) {
  const map = new Map();
  if (!recurringTasks || recurringTasks.length === 0) return map;
  const now = new Date();

  for (const t of recurringTasks) {
    const tid = String(t._id);
    // исключения из БД: done/skipped по originalDate (и перенесённые dueAt)
    const excl = await Occurrence.find({
      taskId: t._id,
      $or: [{ status: { $in: ['done', 'skipped', 'missed'] } }, { dueAt: { $ne: null } }],
    }).select('originalDate dueAt status').lean();
    const doneOrSkipped = new Set();
    const movedByOrig = new Map();
    for (const e of excl) {
      if (e.status === 'done' || e.status === 'skipped' || e.status === 'missed') doneOrSkipped.add(e.originalDate.getTime());
      if (e.dueAt && e.originalDate && e.dueAt.getTime() !== e.originalDate.getTime()) {
        movedByOrig.set(e.originalDate.getTime(), e.dueAt);
      }
    }

    // окно: от начала жизни задачи (createdAt), но не глубже года назад
    const yearAgo = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000);
    const created = t.createdAt ? new Date(t.createdAt) : yearAgo;
    const from = created > yearAgo ? created : yearAgo;
    const dates = getNextOccurrences(t.recurrence, from, 500);
    let count = 0;
    let lastAt = null;
    let nextAt = null;
    for (const d of dates) {
      if (doneOrSkipped.has(d.getTime())) continue;
      const effective = movedByOrig.get(d.getTime()) || d;
      if (effective.getTime() < now.getTime()) {
        count++;
        if (!lastAt || effective > lastAt) lastAt = effective;
      } else {
        if (!nextAt || effective < nextAt) nextAt = effective;
      }
    }
    map.set(tid, { count, lastAt, nextAt });
  }

  return map;
}

/**
 * Обогатить задачу сроковыми полями (единый смысл для list/dashboard/календаря).
 * @param {object} task  lean-объект или toObject()
 * @param {Map} summary результат summarizeOccurrences
 */
function enrichTaskDue(task, summary) {
  const isRec = !!(task.recurrence && task.recurrence.freq);
  if (isRec) {
    const info = summary.get(String(task._id));
    task.pendingOccurrenceCount = info ? info.count : 0;
    task.nextOccurrenceDueAt = (info && info.nextAt) || (info && info.lastAt) || null;
    task.lastOverdueAt = (info && info.lastAt) || null;
    // Статус текущего вхождения (F1c): просрочено, если есть неподтверждённые прошедшие
    task.occurrenceStatus = task.pendingOccurrenceCount > 0 ? 'overdue' : 'pending';
  } else {
    task.pendingOccurrenceCount = 0;
    task.nextOccurrenceDueAt = task.dueDate || null;
    task.lastOverdueAt = null;
    task.occurrenceStatus = task.dueDate && new Date(task.dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
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
