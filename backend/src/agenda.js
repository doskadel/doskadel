/**
 * Agenda — планировщик задач.
 */

const Agenda = require('agenda');
const Task = require('./models/Task');
const Occurrence = require('./models/Occurrence');
const Status = require('./models/Status');
const User = require('./models/User');
const { getNextOccurrences } = require('./utils/recurrence');
const { sendToUser, isConfigured } = require('./utils/webPush');

const OCCURRENCE_HORIZON_DAYS = 7;
const OCCURRENCE_LIMIT_PER_TASK = 100;
const PUSH_BEFORE_MINUTES = 5;
const OVERDUE_AFTER_HOURS = 1;
const DAY_BEFORE_HOURS = 24;

// ============================================================
// Helpers
// ============================================================

const isInQuietHours = (user, now) => {
  const qh = user?.notificationSettings?.quietHours;
  if (!qh || !qh.enabled) return false;
  const [fh, fm] = (qh.from || '22:00').split(':').map((v) => parseInt(v, 10));
  const [th, tm] = (qh.to || '08:00').split(':').map((v) => parseInt(v, 10));

  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  const from = fh * 60 + fm;
  const to = th * 60 + tm;

  if (from === to) return false;
  if (from < to) {
    return cur >= from && cur < to;
  }
  return cur >= from || cur < to;
};

const userWantsPush = (user, kind) => {
  const s = user?.notificationSettings;
  if (!s || !s.enabled) return false;
  if (kind === 'dayBefore' && s.dayBefore === false) return false;
  if (kind === 'beforeDue' && s.beforeDue === false) return false;
  if (kind === 'atDue' && s.atDue === false) return false;
  if (kind === 'overdue' && s.overdueReminder === false) return false;
  return true;
};

// ============================================================
// Agenda
// ============================================================
const startAgenda = async () => {
  const agenda = new Agenda({
    db: {
      address: process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel',
      collection: 'agendaJobs'
    },
    processEvery: '1 minute',
    maxConcurrency: 5
  });

  // ==========================================================
  // 1. Генерация occurrences
  // ==========================================================
  agenda.define('generate recurring occurrences', async () => {
    const now = new Date();
    const recurringTasks = await Task.find({ 'recurrence.type': { $exists: true } });
    let created = 0;

    for (const task of recurringTasks) {
      if (!task.recurrence || !task.recurrence.type) continue;
      const dates = getNextOccurrences(task.recurrence, now, OCCURRENCE_HORIZON_DAYS);
      if (dates.length === 0) continue;

      const existing = await Occurrence.find({
        taskId: task._id,
        dueAt: { $in: dates }
      }).select('dueAt');
      const existingSet = new Set(existing.map((o) => o.dueAt.getTime()));
      const toCreate = dates.filter((d) => !existingSet.has(d.getTime()));

      if (toCreate.length > 0) {
        await Occurrence.insertMany(
          toCreate.map((d) => ({
            taskId: task._id,
            userId: task.userId,
            dueAt: d,
            status: 'pending',
            notificationsSent: {
              dayBefore: null,
              beforeDue: null,
              atDue: null,
              overdue: null
            }
          }))
        );
        created += toCreate.length;
      }
    }

    if (created > 0) console.log(`[AGENDA] Created ${created} occurrences`);
  });

  // ==========================================================
  // 2. Recurring: pre-due (за 5 минут)
  // ==========================================================
  agenda.define('send pre-due pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() + PUSH_BEFORE_MINUTES * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 60 * 1000);

    const occurrences = await Occurrence.find({
      status: 'pending',
      dueAt: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.beforeDue': null
    }).populate('taskId', 'title notifications userId');

    for (const occ of occurrences) {
      if (!occ.taskId) continue;
      if (occ.taskId.notifications && occ.taskId.notifications.enabled === false) continue;

      const user = await User.findById(occ.userId).select('notificationSettings');
      if (!userWantsPush(user, 'beforeDue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(occ.userId, {
        title: `Через ${PUSH_BEFORE_MINUTES} мин: ${occ.taskId.title}`,
        body: 'Нажмите, чтобы открыть задачу',
        icon: '/logo192.png',
        tag: `occ-${occ._id}-before`,
        data: { url: `/tasks?task=${occ.taskId._id}&occurrence=${occ._id}`, occurrenceId: String(occ._id) }
      });

      if (result.sent > 0) {
        occ.notificationsSent.beforeDue = new Date();
        await occ.save();
      }
    }
  });

  // ==========================================================
  // 3. Recurring: at-due (в момент)
  // ==========================================================
  agenda.define('send at-due pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 1000);
    const windowEnd = new Date(now.getTime() + 1000);

    const occurrences = await Occurrence.find({
      status: 'pending',
      dueAt: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.atDue': null
    }).populate('taskId', 'title notifications userId');

    for (const occ of occurrences) {
      if (!occ.taskId) continue;
      if (occ.taskId.notifications && occ.taskId.notifications.enabled === false) continue;

      const user = await User.findById(occ.userId).select('notificationSettings');
      if (!userWantsPush(user, 'atDue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(occ.userId, {
        title: `Пора: ${occ.taskId.title}`,
        body: 'Нажмите, чтобы подтвердить',
        icon: '/logo192.png',
        tag: `occ-${occ._id}-due`,
        requireInteraction: true,
        actions: [{ action: 'confirm', title: 'Подтвердить' }],
        data: { url: `/tasks?task=${occ.taskId._id}&occurrence=${occ._id}`, occurrenceId: String(occ._id) }
      });

      if (result.sent > 0) {
        occ.notificationsSent.atDue = new Date();
        await occ.save();
      }
    }
  });

  // ==========================================================
  // 4. Recurring: overdue (через час после dueAt)
  // ==========================================================
  agenda.define('send overdue pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - (OVERDUE_AFTER_HOURS * 60 + 1) * 60 * 1000);
    const windowEnd = new Date(now.getTime() - OVERDUE_AFTER_HOURS * 60 * 60 * 1000);

    const occurrences = await Occurrence.find({
      status: 'pending',
      dueAt: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.overdue': null
    }).populate('taskId', 'title notifications userId');

    for (const occ of occurrences) {
      if (!occ.taskId) continue;
      if (occ.taskId.notifications && occ.taskId.notifications.enabled === false) continue;

      const user = await User.findById(occ.userId).select('notificationSettings');
      if (!userWantsPush(user, 'overdue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(occ.userId, {
        title: `Пропущено: ${occ.taskId.title}`,
        body: 'Задача просрочена и не подтверждена',
        icon: '/logo192.png',
        tag: `occ-${occ._id}-overdue`,
        data: { url: `/tasks?task=${occ.taskId._id}&occurrence=${occ._id}`, occurrenceId: String(occ._id) }
      });

      if (result.sent > 0) {
        occ.notificationsSent.overdue = new Date();
        await occ.save();
      }
    }
  });

  // ==========================================================
  // 5. Recurring: day-before (за 24 часа)
  // ==========================================================
  agenda.define('send day-before pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 - 1) * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 + 1) * 60 * 1000);

    const occurrences = await Occurrence.find({
      status: 'pending',
      dueAt: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.dayBefore': null
    }).populate('taskId', 'title notifications userId');

    for (const occ of occurrences) {
      if (!occ.taskId) continue;
      if (occ.taskId.notifications && occ.taskId.notifications.enabled === false) continue;

      const user = await User.findById(occ.userId).select('notificationSettings');
      if (!userWantsPush(user, 'dayBefore')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(occ.userId, {
        title: `Завтра: ${occ.taskId.title}`,
        body: 'Напоминание о сроке',
        icon: '/logo192.png',
        tag: `occ-${occ._id}-daybefore`,
        data: { url: `/tasks?task=${occ.taskId._id}&occurrence=${occ._id}`, occurrenceId: String(occ._id) }
      });

      if (result.sent > 0) {
        occ.notificationsSent.dayBefore = new Date();
        await occ.save();
      }
    }
  });

  // ==========================================================
  // 6. Single: pre-due (за 5 минут)
  // ==========================================================
  agenda.define('send single pre-due pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() + PUSH_BEFORE_MINUTES * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + 60 * 1000);

    const activeStatuses = await Status.find({ isFinal: false }).select('_id');
    const activeStatusIds = activeStatuses.map((s) => s._id);

    const tasks = await Task.find({
      recurrence: null,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.beforeDue': null
    });

    for (const task of tasks) {
      if (task.notifications && task.notifications.enabled === false) continue;

      const user = await User.findById(task.userId).select('notificationSettings');
      if (!userWantsPush(user, 'beforeDue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(task.userId, {
        title: `Через ${PUSH_BEFORE_MINUTES} мин: ${task.title}`,
        body: 'Нажмите, чтобы открыть задачу',
        icon: '/logo192.png',
        tag: `task-${task._id}-before`,
        data: { url: `/tasks?task=${task._id}` }
      });

      if (result.sent > 0) {
        task.notificationsSent.beforeDue = new Date();
        await task.save();
      }
    }
  });

  // ==========================================================
  // 7. Single: at-due (в момент)
  // ==========================================================
  agenda.define('send single at-due pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 1000);
    const windowEnd = new Date(now.getTime() + 1000);

    const activeStatuses = await Status.find({ isFinal: false }).select('_id');
    const activeStatusIds = activeStatuses.map((s) => s._id);

    const tasks = await Task.find({
      recurrence: null,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.atDue': null
    });

    for (const task of tasks) {
      if (task.notifications && task.notifications.enabled === false) continue;

      const user = await User.findById(task.userId).select('notificationSettings');
      if (!userWantsPush(user, 'atDue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(task.userId, {
        title: `Пора: ${task.title}`,
        body: 'Срок задачи наступил',
        icon: '/logo192.png',
        tag: `task-${task._id}-due`,
        requireInteraction: true,
        data: { url: `/tasks?task=${task._id}` }
      });

      if (result.sent > 0) {
        task.notificationsSent.atDue = new Date();
        await task.save();
      }
    }
  });

  // ==========================================================
  // 8. Single: overdue (через час)
  // ==========================================================
  agenda.define('send single overdue pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - (OVERDUE_AFTER_HOURS * 60 + 1) * 60 * 1000);
    const windowEnd = new Date(now.getTime() - OVERDUE_AFTER_HOURS * 60 * 60 * 1000);

    const activeStatuses = await Status.find({ isFinal: false }).select('_id');
    const activeStatusIds = activeStatuses.map((s) => s._id);

    const tasks = await Task.find({
      recurrence: null,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.overdue': null
    });

    for (const task of tasks) {
      if (task.notifications && task.notifications.enabled === false) continue;

      const user = await User.findById(task.userId).select('notificationSettings');
      if (!userWantsPush(user, 'overdue')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(task.userId, {
        title: `Просрочено: ${task.title}`,
        body: 'Срок задачи прошёл',
        icon: '/logo192.png',
        tag: `task-${task._id}-overdue`,
        data: { url: `/tasks?task=${task._id}` }
      });

      if (result.sent > 0) {
        task.notificationsSent.overdue = new Date();
        await task.save();
      }
    }
  });

  // ==========================================================
  // 9. Single: day-before (за 24 часа)
  // ==========================================================
  agenda.define('send single day-before pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 - 1) * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 + 1) * 60 * 1000);

    const activeStatuses = await Status.find({ isFinal: false }).select('_id');
    const activeStatusIds = activeStatuses.map((s) => s._id);

    const tasks = await Task.find({
      recurrence: null,
      statusId: { $in: activeStatusIds },
      dueDate: { $gte: windowStart, $lt: windowEnd },
      'notificationsSent.dayBefore': null
    });

    for (const task of tasks) {
      if (task.notifications && task.notifications.enabled === false) continue;

      const user = await User.findById(task.userId).select('notificationSettings');
      if (!userWantsPush(user, 'dayBefore')) continue;
      if (isInQuietHours(user, now)) continue;

      const result = await sendToUser(task.userId, {
        title: `Завтра: ${task.title}`,
        body: 'Напоминание о сроке',
        icon: '/logo192.png',
        tag: `task-${task._id}-daybefore`,
        data: { url: `/tasks?task=${task._id}` }
      });

      if (result.sent > 0) {
        task.notificationsSent.dayBefore = new Date();
        await task.save();
      }
    }
  });

  // ==========================================================
  // 10. Очистка старых occurrences
  // ==========================================================
  agenda.define('cleanup old occurrences', async () => {
    const recurringTasks = await Task.find({ 'recurrence.type': { $exists: true } }).select('_id');
    let deleted = 0;

    for (const task of recurringTasks) {
      const total = await Occurrence.countDocuments({ taskId: task._id });
      if (total <= OCCURRENCE_LIMIT_PER_TASK) continue;

      const toDelete = total - OCCURRENCE_LIMIT_PER_TASK;
      const oldDone = await Occurrence.find({
        taskId: task._id,
        status: 'done'
      }).sort({ dueAt: 1 }).limit(toDelete).select('_id');

      if (oldDone.length > 0) {
        await Occurrence.deleteMany({ _id: { $in: oldDone.map((o) => o._id) } });
        deleted += oldDone.length;
      }
    }

    if (deleted > 0) console.log(`[AGENDA] Cleaned up ${deleted} old occurrences`);
  });

  // ==========================================================
  // ВАЖНО: сначала start(), потом every()
  // ==========================================================
  await agenda.start();
  
// Даём Agenda время на инициализацию _collection
await new Promise((resolve) => setTimeout(resolve, 2000));

  // Каждую минуту
  await agenda.every('* * * * *', 'generate recurring occurrences');
  await agenda.every('* * * * *', 'send pre-due pushes');
  await agenda.every('* * * * *', 'send at-due pushes');
  await agenda.every('* * * * *', 'send overdue pushes');
  await agenda.every('* * * * *', 'send single pre-due pushes');
  await agenda.every('* * * * *', 'send single at-due pushes');
  await agenda.every('* * * * *', 'send single overdue pushes');

  // Раз в 15 минут
  await agenda.every('*/15 * * * *', 'send day-before pushes');
  await agenda.every('*/15 * * * *', 'send single day-before pushes');

  // Раз в день
  await agenda.every('0 3 * * *', 'cleanup old occurrences');

  console.log('[AGENDA] Started');
  return agenda;
};

module.exports = { startAgenda };