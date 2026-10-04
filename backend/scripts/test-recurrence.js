// Тест этапа 1 F1c: маппинг recurrence, unique-индекс, идемпотентность.
// Запуск (в контейнере backend): node scripts/test-recurrence.js
const mongoose = require('mongoose');
const { getNextOccurrences, formatRecurrence } = require('../src/utils/recurrence');

let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n); } };

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;

  // 1) Маппинг в БД: у повторяющейся задачи есть freq (не type)
  const recTask = await db.collection('tasks').findOne({ 'recurrence.freq': { $exists: true } });
  check('есть задача с recurrence.freq', !!recTask);
  check('нет старого recurrence.type', !(recTask && recTask.recurrence && recTask.recurrence.type));

  // 2) Occurrence имеет originalDate
  const noOrig = await db.collection('occurrences').countDocuments({ $or: [{ originalDate: null }, { originalDate: { $exists: false } }] });
  check('все Occurrence имеют originalDate', noOrig === 0);

  // 3) unique-индекс {taskId, originalDate}
  const idx = (await db.collection('occurrences').indexes()).find((i) => i.name === 'taskId_1_originalDate_1');
  check('unique-индекс taskId+originalDate существует', !!idx && !!idx.unique);

  // 4) Генерация из правила (unit): daily
  const daily = getNextOccurrences({ freq: 'daily', time: '09:00', interval: 1 }, new Date('2026-10-01T00:00:00Z'), 3);
  check('daily -> 3 даты', daily.length === 3);
  check('daily формат', formatRecurrence({ freq: 'daily', time: '09:00' }).includes('Каждый день'));

  // 5) weekly с byWeekday
  const weekly = getNextOccurrences({ freq: 'weekly', byWeekday: [1], time: '10:00', interval: 1 }, new Date('2026-10-01T00:00:00Z'), 2);
  check('weekly -> 2 даты (пн)', weekly.length === 2 && weekly.every((d) => d.getUTCDay() === 1));

  // 6) monthly
  const monthly = getNextOccurrences({ freq: 'monthly', byMonthDay: 15, time: '12:00', interval: 1 }, new Date('2026-10-01T00:00:00Z'), 2);
  check('monthly -> 2 даты (15-е)', monthly.length === 2 && monthly.every((d) => d.getUTCDate() === 15));

  // 7) DST-граница: Europe/Berlin, ежедневно 02:30 — переход на летнее время (30.03.2026)
  const dst = getNextOccurrences({ freq: 'daily', time: '02:30', interval: 1, tz: 'Europe/Berlin' }, new Date('2026-03-28T00:00:00Z'), 5);
  check('DST: 5 вхождений (Berlin)', dst.length === 5);
  const { DateTime } = require('luxon');
  const localTimes = dst.map((d) => DateTime.fromJSDate(d, { zone: 'Europe/Berlin' }).toFormat('HH:mm'));
  // 28.03 (до перехода) = 02:30; после перехода (02:00->03:00) несуществующее 02:30 сдвигается на 03:30
  check('DST: до перехода 02:30', localTimes[0] === '02:30');
  check('DST: после перехода сдвиг на 03:30 (нет пропуска дня)', localTimes.slice(1).every((t) => t === '03:30'));
  // Зона задана -> до/после DST разное UTC-смещение
  const offsets = dst.map((d) => DateTime.fromJSDate(d, { zone: 'Europe/Berlin' }).offset);
  check('DST: смещение меняется (60->120)', new Set(offsets).size >= 2);

  // 8) Материализация под пуш: upsert идемпотентен, атомарная пометка (compare-and-set)
  const Occurrence = require('../src/models/Occurrence');
  const { markNotified } = require('../src/utils/dueItems');
  const t = await db.collection('tasks').findOne({ 'recurrence.freq': { $exists: true } });
  if (t) {
    const orig = new Date('2030-01-01T09:00:00.000Z');
    const base = { taskId: t._id, originalDate: orig };
    const set = { $setOnInsert: { taskId: t._id, originalDate: orig, dueAt: orig, status: 'pending', workspaceId: t.workspaceId, userId: t.userId, createdBy: t.createdBy || t.userId } };
    const a = await Occurrence.findOneAndUpdate(base, set, { new: true, upsert: true, setDefaultsOnInsert: true });
    const b = await Occurrence.findOneAndUpdate(base, set, { new: true, upsert: true, setDefaultsOnInsert: true });
    check('upsert не дублирует (один _id)', String(a._id) === String(b._id));
    // атомарная пометка: первый раз true, второй false
    const m1 = await markNotified({ source: 'occurrence', id: a._id }, 'beforeDue');
    const m2 = await markNotified({ source: 'occurrence', id: a._id }, 'beforeDue');
    check('markNotified: первый true, повторно false (no double-send)', m1 === true && m2 === false);
    await db.collection('occurrences').deleteOne({ _id: a._id });
  }

  // 9) unmarkNotified: снятие флага при ошибке + счётчик попыток
  const { unmarkNotified } = require('../src/utils/dueItems');
  if (t) {
    const orig2 = new Date('2031-01-01T09:00:00.000Z');
    const doc = await Occurrence.findOneAndUpdate(
      { taskId: t._id, originalDate: orig2 },
      { $setOnInsert: { taskId: t._id, originalDate: orig2, dueAt: orig2, status: 'pending', workspaceId: t.workspaceId, userId: t.userId, createdBy: t.createdBy || t.userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await markNotified({ source: 'occurrence', id: doc._id }, 'atDue');
    const before = await Occurrence.findById(doc._id).lean();
    check('attempts инкрементится', before.notificationsSent.atDueAttempts === 1);
    await unmarkNotified({ source: 'occurrence', id: doc._id }, 'atDue');
    const after = await Occurrence.findById(doc._id).lean();
    check('unmark снял флаг (atDue=null)', after.notificationsSent.atDue === null);
    await db.collection('occurrences').deleteOne({ _id: doc._id });
  }

  await mongoose.disconnect();
  console.log(`\nИТОГ recurrence: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
