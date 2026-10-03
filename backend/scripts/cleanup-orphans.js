// Чистка осиротевших данных (workspace/status/membership от тестов) + dry-run.
// Запуск: node scripts/cleanup-orphans.js [--dry-run]
const mongoose = require('mongoose');
// По умолчанию dry-run; удаление — только с флагом --apply
const DRY = !process.argv.includes('--apply');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const wsIds = (await db.collection('workspaces').find({}, { projection: { _id: 1 } }).toArray()).map((w) => String(w._id));
  // Осиротевшие документы: workspaceId, которого нет в workspaces
  const collections = ['tasks', 'occurrences', 'articles', 'status', 'memberships'];
  let totalOrphan = 0;
  for (const coll of collections) {
    const all = await db.collection(coll).distinct('workspaceId');
    const orphan = all.filter((w) => w && !wsIds.includes(String(w)));
    if (orphan.length === 0) continue;
    const n = await db.collection(coll).countDocuments({ workspaceId: { $in: orphan } });
    totalOrphan += n;
    console.log(coll, 'осиротевших документов:', n, '(workspaceId:', orphan.length, ')');
    if (!DRY) await db.collection(coll).deleteMany({ workspaceId: { $in: orphan } });
  }
  console.log('ИТОГО осиротевших:', totalOrphan);
  console.log(DRY ? 'DRY-RUN (без записи)' : 'готово');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
