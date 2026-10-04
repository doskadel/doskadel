// Чистка осиротевших данных: workspace без существующего createdBy + их дочерние.
// Dry-run по умолчанию; удаление с --apply.
const mongoose = require('mongoose');
const APPLY = process.argv.includes('--apply');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  const userIds = users.map(function (u) { return String(u._id); });
  const ws = await db.collection('workspaces').find({}).toArray();
  const orphanIds = ws.filter(function (w) { return !userIds.includes(String(w.createdBy)); }).map(function (w) { return w._id; });
  console.log('осиротевших workspace:', orphanIds.length);
  let total = 0;
  const cols = ['tasks', 'occurrences', 'articles', 'status', 'memberships'];
  for (const c of cols) {
    const n = await db.collection(c).countDocuments({ workspaceId: { $in: orphanIds } });
    total += n;
    if (APPLY && n > 0) await db.collection(c).deleteMany({ workspaceId: { $in: orphanIds } });
  }
  console.log('дочерних документов:', total);
  if (APPLY && orphanIds.length > 0) await db.collection('workspaces').deleteMany({ _id: { $in: orphanIds } });
  console.log(APPLY ? 'готово' : 'DRY-RUN (--apply для удаления)');
  await mongoose.disconnect();
})().catch(function (e) { console.error(e); process.exit(1); });
