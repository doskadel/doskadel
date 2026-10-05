// R1 шаг 1: единая абстракция "список сроков" для agenda (и далее dashboard/calendar).
// Нормализует два источника (Occurrence — повторяющиеся, Task — разовые)
// в общий список due-элементов, снимая дублирование 8 job в agenda.

const Task = require('../models/Task');
const Occurrence = require('../models/Occurrence');
const { SINGLE, RECURRING } = require('./taskKinds');
const { getNextOccurrences } = require('./recurrence');

/**
 * Вычислить вхождения повторяющихся задач на лету в окне [gte, lt).
 * Накладывает исключения: если на дату правила есть Occurrence (done/skipped/moved) — пропускаем.
 * @param {{gte: Date, lt: Date}} window
 * @param {object} ctx { activeStatusIds }
 */
async function computeOccurrences(window, ctx = {}) {
  if (!ctx.activeStatusIds) ctx.activeStatusIds = await getActiveStatusIds();
  const q = { ...RECURRING, statusId: { $in: ctx.activeStatusIds } };
  if (ctx.workspaceId) q.workspaceId = ctx.workspaceId;
  const tasks = await Task.find(q).lean();

  const out = [];
  for (const t of tasks) {
    if (t.notifications && t.notifications.enabled === false) continue;
    // считаем вхождения чуть раньше окна; floor — параметр (дефолт 90 дней для job)
    const floorDays = ctx.floorDays != null ? ctx.floorDays : 90;
    const floor = floorDays > 0 ? new Date(Date.now() - floorDays * 24 * 60 * 60 * 1000) : new Date(0);
    let from = new Date(Math.max(window.gte.getTime() - 24 * 60 * 60 * 1000, floor.getTime()));
    // Нижняя граница вхождений: задача не может иметь вхождения раньше создания.
    if (t.createdAt) {
      const ca = new Date(t.createdAt);
      if (!isNaN(ca.getTime()) && ca > from) from = ca;
    }
    // Начало серии (F1e): не считать вхождения раньше startDate
    if (t.recurrence.startDate) {
      const sd = new Date(t.recurrence.startDate);
      if (!isNaN(sd.getTime()) && sd > from) from = sd;
    }
    // F1f: после возврата из финала считать только с activeSince
    if (t.activeSince) {
      const as = new Date(t.activeSince);
      if (!isNaN(as.getTime()) && as > from) from = as;
    }
    const dates = getNextOccurrences(t.recurrence, from, 60).filter(
      (d) => d >= window.gte && d < window.lt
    );
    if (dates.length === 0) continue;
    // исключения: существующие Occurrence по originalDate
    const origs = await Occurrence.find({ taskId: t._id, originalDate: { $in: dates } })
      .select('originalDate status dueAt')
      .lean();
    const origMap = new Map(origs.map((o) => [o.originalDate.getTime(), o]));
    for (const d of dates) {
      const ex = origMap.get(d.getTime());
      if (ex) {
        // если вхождение перенесено (dueAt != originalDate) и попало в окно — отдадим по dueAt
        if (ex.status === 'pending' && ex.dueAt && ex.dueAt.getTime() !== d.getTime() && ex.dueAt >= window.gte && ex.dueAt < window.lt) {
          out.push({ task: t, dueAt: ex.dueAt, originalDate: d, occurrenceId: ex._id });
        }
        continue; // done/skipped или уже обработано — не отдаём как обычное
      }
      out.push({ task: t, dueAt: d, originalDate: d, occurrenceId: null });
    }
  }
  return out;
}

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
    // Вхождения на лету + материализация под уведомление (upsert по {taskId, originalDate}).
    const computed = await computeOccurrences(window, ctx);
    const out = [];
    for (const c of computed) {
      const t = c.task;
      // upsert записи (идемпотентно через unique {taskId, originalDate})
      const res = await Occurrence.findOneAndUpdate(
        { taskId: t._id, originalDate: c.originalDate },
        {
          $setOnInsert: {
            taskId: t._id,
            originalDate: c.originalDate,
            dueAt: c.dueAt,
            status: 'pending',
            workspaceId: t.workspaceId,
            userId: t.userId,
            createdBy: t.createdBy || t.userId,
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
      // если запись уже была отправлена по этому полю — пропускаем
      if (res.notificationsSent && res.notificationsSent[field]) continue;
      if (res.status !== 'pending') continue; // done/skipped/missed — не шлём
      out.push({
        source: 'occurrence',
        id: res._id,
        taskId: t._id,
        userId: t.userId,
        title: t.title,
        dueAt: res.dueAt,
        occurrenceId: String(res._id),
        requiresConfirm: true,
      });
    }
    return out;
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

/**
 * Пометить отправку атомарно (compare-and-set): ставим флаг только если он ещё не установлен.
 * Возвращает true, если пометка удалась (значит пуш можно считать отправленным нами).
 */
const MAX_SEND_ATTEMPTS = 3;

async function markNotified(item, field) {
  const Model = item.source === 'occurrence' ? Occurrence : Task;
  const res = await Model.findOneAndUpdate(
    { _id: item.id, [`notificationsSent.${field}`]: null },
    { $set: { [`notificationsSent.${field}`]: new Date() }, $inc: { [`notificationsSent.${field}Attempts`]: 1 } },
    { new: true }
  );
  return !!res;
}

/** Снять флаг отправки (при ошибке), чтобы можно было повторить (до MAX_SEND_ATTEMPTS). */
async function unmarkNotified(item, field) {
  const Model = item.source === 'occurrence' ? Occurrence : Task;
  const cur = await Model.findById(item.id).select(`notificationsSent.${field}Attempts`).lean();
  const attempts = (cur && cur.notificationsSent && cur.notificationsSent[`${field}Attempts`]) || 0;
  if (attempts >= MAX_SEND_ATTEMPTS) {
    console.error(`[push] ${field}: превышено попыток (${attempts}), пуш потерян для ${item.id}`);
    return; // оставляем флаг (не спамим), логируем
  }
  await Model.updateOne({ _id: item.id }, { $set: { [`notificationsSent.${field}`]: null } });
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

    // compare-and-set: атомарно занимаем флаг; если уже занят — другой job/прогон отправил
    const claimed = await markNotified(item, field);
    if (!claimed) continue;

    const payload = buildPush(item);
    try {
      const result = await sendToUser(item.userId, { icon: '/logo192.png', ...payload });
      // если никому не ушло (нет подписок) — снимаем флаг, чтобы не считать отправленным
      if (result && result.sent === 0) await unmarkNotified(item, field);
    } catch (e) {
      console.error('[push] ошибка отправки:', e.message);
      await unmarkNotified(item, field);
    }
  }
}

module.exports = { getDueItems, markNotified, unmarkNotified, getActiveStatusIds, sendDuePushes, clearUserCache, computeOccurrences };
