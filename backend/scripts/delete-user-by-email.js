// Удаление пользователя по email и ВСЕХ его данных (workspace-скоуп). Dry-run по умолчанию, --apply для удаления.
// Использование: node scripts/delete-user-by-email.js test@test.ru [--apply]
const mongoose = require('mongoose');
const emailArg = process.argv[2];
const APPLY = process.argv.includes('--apply');

(async () => {
  if (!emailArg) { console.error('Укажите email: node scripts/delete-user-by-email.js <email> [--apply]'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const email = emailArg.trim().toLowerCase();
  const user = await db.collection('users').findOne({ email });
  if (!user) { console.log('Пользователь не найден:', email); await mongoose.disconnect(); return; }
  console.log('Найден:', user.username, user.email, String(user._id));

  const ws = await db.collection('workspaces').find({ createdBy: user._id }).toArray();
  const wsIds = ws.map((w) => w._id);
  console.log('workspaces:', wsIds.length);

  // Коллекции с workspaceId
  const wsColls = ['tasks', 'occurrences', 'articles', 'status', 'memberships', 'attachments', 'comments', 'tags', 'entitylinks'];
  let total = 0;
  for (const coll of wsColls) {
    const n = await db.collection(coll).countDocuments({ workspaceId: { $in: wsIds } });
    console.log(`  ${coll}: ${n}`);
    total += n;
    if (APPLY && n) await db.collection(coll).deleteMany({ workspaceId: { $in: wsIds } });
  }
  if (APPLY) {
    await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
    await db.collection('refreshtokens').deleteMany({ userId: user._id });
    await db.collection('pushsubscriptions').deleteMany({ userId: user._id });
    await db.collection('users').deleteOne({ _id: user._id });
  }
  console.log('документов:', total);
  console.log(APPLY ? 'УДАЛЕНО' : 'DRY-RUN (добавьте --apply для удаления)');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
