// Миграция F1c: Task.recurrence -> новый формат (freq/interval/byWeekday/byMonthDay/until/count/tz);
// Occurrence: originalDate = dueAt, completedAt = confirmedAt. Идемпотентно.
// Запуск (в контейнере backend): node scripts/migrate-recurrence.js [--dry-run]
// PЕРЕД ЗАПУСКОМ: mongodump.
const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const Occurrence = require('../src/models/Occurrence');

const DRY = process.argv.includes('--dry-run');

// Старое правило -> новое
const DEFAULT_TZ = process.env.DEFAULT_TZ || 'Europe/Moscow';

function mapRecurrence(rec) {
  if (!rec || !rec.type) return null;
  const base = { interval: 1, time: rec.time || null, until: null, count: null, tz: DEFAULT_TZ };
  if (rec.type === 'daily') return { ...base, freq: 'daily' };
  if (rec.type === 'weekly') return { ...base, freq: 'weekly', byWeekday: [rec.dayOfWeek ?? 1] };
  if (rec.type === 'monthly') return { ...base, freq: 'monthly', byMonthDay: rec.dayOfMonth ?? 1 };
  return null;
}

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel';
  await mongoose.connect(uri);
  console.log(DRY ? '=== DRY-RUN ===' : '=== MIGRATION ===');

  // 1) Task.recurrence: старый формат имеет поле 'type'; новый — 'freq'
  const db = mongoose.connection.db;
  const oldTasks = await db.collection('tasks').find({ 'recurrence.type': { $exists: true, $ne: null } }).toArray();
  console.log('задач со старым recurrence:', oldTasks.length);
  let taskUpdated = 0;
  for (const t of oldTasks) {
    const next = mapRecurrence(t.recurrence);
    if (!next) { console.log('  пропуск (не смапилось):', t.title); continue; }
    if (DRY) { taskUpdated++; continue; }
    await db.collection('tasks').updateOne({ _id: t._id }, { $set: { recurrence: next } });
    taskUpdated++;
  }
  console.log('Task: обновлено', taskUpdated);

  // 1b) tz backfill: у повторяющихся с freq, но без tz — проставить DEFAULT_TZ
  const noTz = await db.collection('tasks').countDocuments({ 'recurrence.freq': { $exists: true }, $or: [{ 'recurrence.tz': null }, { 'recurrence.tz': { $exists: false } }] });
  console.log('повторяющихся без tz:', noTz);
  if (!DRY && noTz > 0) {
    const rtz = await db.collection('tasks').updateMany(
      { 'recurrence.freq': { $exists: true }, $or: [{ 'recurrence.tz': null }, { 'recurrence.tz': { $exists: false } }] },
      { $set: { 'recurrence.tz': DEFAULT_TZ } }
    );
    console.log('tz проставлен:', rtz.modifiedCount);
  }

  // 2) Occurrence: originalDate = dueAt (где нет), completedAt = confirmedAt (где done)
  const noOrig = await Occurrence.countDocuments({ $or: [{ originalDate: null }, { originalDate: { $exists: false } }] });
  console.log('Occurrence без originalDate:', noOrig);
  if (!DRY) {
    const r1 = await Occurrence.updateMany(
      { $or: [{ originalDate: null }, { originalDate: { $exists: false } }] },
      [{ $set: { originalDate: '$dueAt' } }]
    );
    console.log('originalDate проставлен:', r1.modifiedCount);
    const r2 = await Occurrence.updateMany(
      { status: 'done', completedAt: null, confirmedAt: { $ne: null } },
      [{ $set: { completedAt: '$confirmedAt' } }]
    );
    console.log('completedAt проставлен:', r2.modifiedCount);
  }

  // 3) Проверка дублей по {taskId, originalDate} (до создания индекса)
  const dup = await Occurrence.aggregate([
    { $match: { originalDate: { $ne: null } } },
    { $group: { _id: { t: '$taskId', d: '$originalDate' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  console.log('дублей {taskId,originalDate}:', dup.length);
  if (dup.length > 0) console.log('ВНИМАНИЕ: есть дубли, unique-индекс не создастся:', JSON.stringify(dup.slice(0, 3)));

  console.log(DRY ? '=== DRY-RUN завершён ===' : '=== готово ===');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
