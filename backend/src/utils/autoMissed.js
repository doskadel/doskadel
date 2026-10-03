const Occurrence = require('../models/Occurrence');

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
  let marked = 0;
  for (const g of agg) {
    if (g.ids.length <= 1) continue;
    const oldIds = g.ids.slice(0, -1).map((x) => x.id);
    if (dry) { marked += oldIds.length; continue; }
    const r = await Occurrence.updateMany({ _id: { $in: oldIds }, status: 'pending' }, { $set: { status: 'missed' } });
    marked += r.modifiedCount;
  }
  return marked;
}

module.exports = { runAutoMissed };
