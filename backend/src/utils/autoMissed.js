const Occurrence = require('../models/Occurrence');
const Task = require('../models/Task');
const Status = require('../models/Status');

/**
 * Авто-missed (F1c): старые просроченные чистые pending -> missed, последнее оставляем.
 * Не трогает записи с notificationsSent или действием (status != pending).
 * @param {boolean} dry — только посчитать
 * @returns {Promise<number>} сколько помечено (или было бы помечено)
 */
async function runAutoMissed(dry = false) {
  const now = new Date();
  const agg = await Occurrence.aggregate([
    { $match: {
      status: 'pending',
      dueAt: { $lt: now },
      'notificationsSent.dayBefore': null,
      'notificationsSent.beforeDue': null,
      'notificationsSent.atDue': null,
      'notificationsSent.overdue': null,
    } },
    { $sort: { taskId: 1, dueAt: 1 } },
    { $group: { _id: '$taskId', ids: { $push: { id: '$_id', dueAt: '$dueAt' } } } },
  ]);
  // F1f: финальные задачи авто-missed не трогает
  const activeStatuses = await Status.find({ isFinal: false }).select('_id').lean();
  const activeIds = new Set(activeStatuses.map((s) => String(s._id)));
  const taskIds = agg.map((g) => g._id);
  const tasks = await Task.find({ _id: { $in: taskIds } }).select('_id statusId').lean();
  const activeTaskIds = new Set(tasks.filter((t) => activeIds.has(String(t.statusId))).map((t) => String(t._id)));

  let marked = 0;
  for (const g of agg) {
    if (!activeTaskIds.has(String(g._id))) continue;
    if (g.ids.length <= 1) continue;
    const oldIds = g.ids.slice(0, -1).map((x) => x.id);
    if (dry) { marked += oldIds.length; continue; }
    const r = await Occurrence.updateMany({ _id: { $in: oldIds }, status: 'pending' }, { $set: { status: 'missed' } });
    marked += r.modifiedCount;
  }
  return marked;
}

module.exports = { runAutoMissed };
