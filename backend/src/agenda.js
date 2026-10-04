/**
 * Agenda — планировщик задач.
 */

const Agenda = require('agenda');
const Task = require('./models/Task');
const { SINGLE, RECURRING } = require('./utils/taskKinds');
const { sendDuePushes } = require('./utils/dueItems');
const { runAutoMissed } = require('./utils/autoMissed');
const Occurrence = require('./models/Occurrence');
const { sendToUser, isConfigured } = require('./utils/webPush');

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
  // 1. Вхождения повторяющихся — считаются НА ЛЕТУ (F1c этап 2).
  //    Occurrence материализуются только под пуш (dueItems) или при действии.
  //    Job 'generate recurring occurrences' удалён.
  // ==========================================================

  // ==========================================================
  // 1b. Авто-missed: старые просроченные pending (кроме последнего) -> missed.
  //     Правило 'показывать только последнее просроченное'.
  // ==========================================================
  agenda.define('auto-missed occurrences', async () => {
    const marked = await runAutoMissed(false);
    if (marked > 0) console.log(`[AGENDA] auto-missed: ${marked}`);
  });

  // ==========================================================
  // 2. pre-due (за 5 минут) — разовые + повторяющиеся через единую абстракцию
  // ==========================================================
  const pushDeps = { isConfigured, userWantsPush, isInQuietHours, sendToUser };

  agenda.define('send pre-due pushes', async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + PUSH_BEFORE_MINUTES * 60 * 1000);
    const window = { gte: windowStart, lt: new Date(windowStart.getTime() + 60 * 1000) };

    await sendDuePushes('occurrence', 'beforeDue', window, (item) => ({
      title: `Через ${PUSH_BEFORE_MINUTES} мин: ${item.title}`,
      body: 'Нажмите, чтобы открыть задачу',
      tag: `occ-${item.id}-before`,
      data: { url: `/tasks?task=${item.taskId}&occurrence=${item.occurrenceId}`, occurrenceId: item.occurrenceId }
    }), pushDeps);

    await sendDuePushes('single', 'beforeDue', window, (item) => ({
      title: `Через ${PUSH_BEFORE_MINUTES} мин: ${item.title}`,
      body: 'Нажмите, чтобы открыть задачу',
      tag: `task-${item.id}-before`,
      data: { url: `/tasks?task=${item.taskId}` }
    }), pushDeps);
  });

  // ==========================================================
  // 3. Recurring: at-due (в момент)
  // ==========================================================
  agenda.define('send at-due pushes', async () => {
    const now = new Date();
    const window = { gte: new Date(now.getTime() - 60 * 1000), lt: new Date(now.getTime() + 1000) };

    await sendDuePushes('occurrence', 'atDue', window, (item) => ({
      title: `Пора: ${item.title}`,
      body: 'Нажмите, чтобы подтвердить',
      tag: `occ-${item.id}-due`,
      requireInteraction: true,
      actions: [{ action: 'confirm', title: 'Подтвердить' }],
      data: { url: `/tasks?task=${item.taskId}&occurrence=${item.occurrenceId}`, occurrenceId: item.occurrenceId }
    }), pushDeps);

    await sendDuePushes('single', 'atDue', window, (item) => ({
      title: `Пора: ${item.title}`,
      body: 'Срок задачи наступил',
      tag: `task-${item.id}-due`,
      requireInteraction: true,
      data: { url: `/tasks?task=${item.taskId}` }
    }), pushDeps);
  });

  // ==========================================================
  // 4. Recurring: overdue (через час после dueAt)
  // ==========================================================
  agenda.define('send overdue pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const window = {
      gte: new Date(now.getTime() - (OVERDUE_AFTER_HOURS * 60 + 1) * 60 * 1000),
      lt: new Date(now.getTime() - OVERDUE_AFTER_HOURS * 60 * 60 * 1000)
    };

    await sendDuePushes('occurrence', 'overdue', window, (item) => ({
      title: `Пропущено: ${item.title}`,
      body: 'Задача просрочена и не подтверждена',
      tag: `occ-${item.id}-overdue`,
      data: { url: `/tasks?task=${item.taskId}&occurrence=${item.occurrenceId}`, occurrenceId: item.occurrenceId }
    }), pushDeps);

    await sendDuePushes('single', 'overdue', window, (item) => ({
      title: `Просрочено: ${item.title}`,
      body: 'Срок задачи прошёл',
      tag: `task-${item.id}-overdue`,
      data: { url: `/tasks?task=${item.taskId}` }
    }), pushDeps);
  });

  // ==========================================================
  // 5. Recurring: day-before (за 24 часа)
  // ==========================================================
  agenda.define('send day-before pushes', async () => {
    if (!isConfigured()) return;

    const now = new Date();
    const window = {
      gte: new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 - 1) * 60 * 1000),
      lt: new Date(now.getTime() + (DAY_BEFORE_HOURS * 60 + 1) * 60 * 1000)
    };

    await sendDuePushes('occurrence', 'dayBefore', window, (item) => ({
      title: `Завтра: ${item.title}`,
      body: 'Напоминание о сроке',
      tag: `occ-${item.id}-daybefore`,
      data: { url: `/tasks?task=${item.taskId}&occurrence=${item.occurrenceId}`, occurrenceId: item.occurrenceId }
    }), pushDeps);

    await sendDuePushes('single', 'dayBefore', window, (item) => ({
      title: `Завтра: ${item.title}`,
      body: 'Напоминание о сроке',
      tag: `task-${item.id}-daybefore`,
      data: { url: `/tasks?task=${item.taskId}` }
    }), pushDeps);
  });

  // ==========================================================
  // 10. Очистка старых occurrences
  // ==========================================================
  agenda.define('cleanup old occurrences', async () => {
    const recurringTasks = await Task.find({ ...RECURRING }).select('_id');
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
  await agenda.every('*/10 * * * *', 'auto-missed occurrences');
  await agenda.every('* * * * *', 'send pre-due pushes');
  await agenda.every('* * * * *', 'send at-due pushes');
  await agenda.every('* * * * *', 'send overdue pushes');

  // Раз в 15 минут
  await agenda.every('*/15 * * * *', 'send day-before pushes');

  // Раз в день
  await agenda.every('0 3 * * *', 'cleanup old occurrences');

  console.log('[AGENDA] Started');
  return agenda;
};

module.exports = { startAgenda };