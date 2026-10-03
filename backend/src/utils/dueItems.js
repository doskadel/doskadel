// R1 шаг 1: единая абстракция "список сроков" для agenda (и далее dashboard/calendar).
// Нормализует два источника (Occurrence — повторяющиеся, Task — разовые)
// в общий список due-элементов, снимая дублирование 8 job в agenda.

const Task = require('../models/Task');
const Occurrence = require('../models/Occurrence');
const { SINGLE } = require('./taskKinds');

// Кэш активных (не финальных) статусов на один прогон job.
const getActiveStatusIds = async () => {
  const Status = require('../models/Status');
  const rows = await Status.find({ isFinal: false }).select('_id').lean();
  return rows.map((s) => s._id);
};

/**
 * Вернуть due-элементы одного вида.
 * @param {'occurrence'|'single'} kind
 * @param {string} field  ключ в notificationsSent (beforeDue|atDue|overdue|dayBefore)
 * @param {{gte: Date, lt: Date}} window
 * @param {object} [ctx] кэш прогона: { activeStatusIds }
 * @returns {Promise<Array>} нормализованные элементы
 */
async function getDueItems(kind, field, window, ctx = {}) {
  const notifKey = `notificationsSent.${field}`;

  if (kind === 'occurrence') {
    const rows = await Occurrence.find({
      status: 'pending',
      dueAt: { $gte: window.gte, $lt: window.lt },
      [notifKey]: null
    })
      .populate('taskId', 'title notifications userId')
      .lean();

    return rows
      .filter((o) => o.taskId && !(o.taskId.notifications && o.taskId.notifications.enabled === false))
      .map((o) => ({
        source: 'occurrence',
        id: o._id,
        taskId: o.taskId._id,
        userId: o.userId,
        title: o.taskId.title,
        dueAt: o.dueAt,
        occurrenceId: String(o._id),
        requiresConfirm: true
      }));
  }

  if (!ctx.activeStatusIds) ctx.activeStatusIds = await getActiveStatusIds();

  const rows = await Task.find({
    ...SINGLE,
    statusId: { $in: ctx.activeStatusIds },
    dueDate: { $gte: window.gte, $lt: window.lt },
    [notifKey]: null
  }).lean();

  return rows
    .filter((t) => !(t.notifications && t.notifications.enabled === false))
    .map((t) => ({
      source: 'single',
      id: t._id,
      taskId: t._id,
      userId: t.userId,
      title: t.title,
      dueAt: t.dueDate,
      occurrenceId: null,
      requiresConfirm: false
    }));
}

/** Пометить отправку в исходном документе. */
async function markNotified(item, field) {
  const Model = item.source === 'occurrence' ? Occurrence : Task;
  await Model.updateOne(
    { _id: item.id },
    { $set: { [`notificationsSent.${field}`]: new Date() } }
  );
}

// Кэш настроек пользователя на прогон (в одном job юзер может встретиться многократно).
const userCache = new Map();

async function getUser(userId) {
  const key = String(userId);
  if (userCache.has(key)) return userCache.get(key);
  const User = require('../models/User');
  const u = await User.findById(userId).select('notificationSettings').lean();
  userCache.set(key, u);
  return u;
}

function clearUserCache() {
  userCache.clear();
}

/**
 * Общий обработчик отправки push для due-элементов.
 * @param {'occurrence'|'single'} kind
 * @param {string} field beforeDue|atDue|overdue|dayBefore
 * @param {{gte: Date, lt: Date}} window
 * @param {(item:object)=>object} buildPush payload без icon
 * @param {object} deps { isConfigured, userWantsPush, isInQuietHours, sendToUser }
 */
async function sendDuePushes(kind, field, window, buildPush, deps) {
  const { isConfigured, userWantsPush, isInQuietHours, sendToUser } = deps;
  if (!isConfigured()) return;

  const now = new Date();
  clearUserCache();

  const items = await getDueItems(kind, field, window);

  for (const item of items) {
    const user = await getUser(item.userId);
    if (!userWantsPush(user, field)) continue;
    if (isInQuietHours(user, now)) continue;

    const payload = buildPush(item);
    const result = await sendToUser(item.userId, { icon: '/logo192.png', ...payload });

    if (result && result.sent > 0) {
      await markNotified(item, field);
    }
  }
}

module.exports = { getDueItems, markNotified, getActiveStatusIds, sendDuePushes, clearUserCache };
