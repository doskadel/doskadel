// F1c этап 2: чистка будущих pending-Occurrence без действий и без отправок.
// Такие вхождения теперь считаются на лету; записи нужны только под пуш или при действии.
// Запуск (backend): node scripts/migrate-cleanup-pending.js [--dry-run]   (по умолчанию dry-run)
// Перед запуском: mongodump.
const mongoose = require('mongoose');
const APPLY = process.argv.includes('--apply');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const now = new Date();
  // будущие pending, без отправок (все notificationsSent null) — бесполезны, пересчитываются на лету
  const filter = {
    status: 'pending',
    dueAt: { $gte: now },
    'notificationsSent.dayBefore': null,
    'notificationsSent.beforeDue': null,
    'notificationsSent.atDue': null,
    'notificationsSent.overdue': null,
  };
  const n = await db.collection('occurrences').countDocuments(filter);
  console.log('будущих pending без отправок (к чистке):', n);
  if (APPLY && n > 0) {
    const r = await db.collection('occurrences').deleteMany(filter);
    console.log('удалено:', r.deletedCount);
  }
  console.log(APPLY ? 'готово' : 'DRY-RUN (--apply для удаления)');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
