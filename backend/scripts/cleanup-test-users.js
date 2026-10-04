// Чистка тестовых пользователей (iso_*, dbg_*) и их данных. Dry-run по умолчанию, --apply для удаления.
const mongoose = require('mongoose');
const APPLY = process.argv.includes('--apply');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ username: { $regex: /^(iso_|dbg_)/ } }).toArray();
  console.log('тестовых пользователей:', users.length, users.map((u) => u.username).join(', '));
  let total = 0;
  for (const u of users) {
    const ws = await db.collection('workspaces').find({ createdBy: u._id }).toArray();
    const wsIds = ws.map((w) => w._id);
    for (const coll of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) {
      const n = await db.collection(coll).countDocuments({ workspaceId: { $in: wsIds } });
      total += n;
      if (APPLY && n) await db.collection(coll).deleteMany({ workspaceId: { $in: wsIds } });
    }
    if (APPLY) {
      await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
      await db.collection('refreshtokens').deleteMany({ userId: u._id });
      await db.collection('users').deleteOne({ _id: u._id });
    }
  }
  console.log('документов к удалению/удалено:', total);
  console.log(APPLY ? 'готово' : 'DRY-RUN (--apply для удаления)');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
