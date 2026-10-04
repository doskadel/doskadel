// Миграция фундамента: создать личный workspace каждому User,
// membership(owner), проставить workspaceId и createdBy во всех доменных сущностях.
//
// Запуск (в контейнере backend):
//   node scripts/migrate-workspaces.js --dry-run   (только посчитать, без записи)
//   node scripts/migrate-workspaces.js             (выполнить)
//
// Идемпотентна: повторный запуск не создаёт дублей (membership unique, update только где workspaceId пуст).
// ПЕРЕД ЗАПУСКОМ: mongodump (бэкап).
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const Membership = require('../src/models/Membership');
const Task = require('../src/models/Task');
const Occurrence = require('../src/models/Occurrence');
const Article = require('../src/models/Article');
const Status = require('../src/models/Status');

const DRY = process.argv.includes('--dry-run');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel';
  await mongoose.connect(uri);
  console.log(DRY ? '=== DRY-RUN (без записи) ===' : '=== MIGRATION ===');

  const users = await User.find({}).select('_id username').lean();
  console.log('users:', users.length);

  let createdWs = 0, createdMem = 0, linked = 0;
  const MODELS = [
    ['Task', Task],
    ['Occurrence', Occurrence],
    ['Article', Article],
    ['Status', Status],
  ];
  const counters = {};
  MODELS.forEach(([n]) => { counters[n] = 0; });

  for (const u of users) {
    // 1) workspace: найти личное или создать
    let ws = await Workspace.findOne({ createdBy: u._id, isPersonal: true });
    if (!ws) {
      if (!DRY) {
        ws = await Workspace.create({ name: 'Личное', isPersonal: true, createdBy: u._id });
      }
      createdWs++;
    }

    // 2) membership(owner)
    if (!DRY && ws) {
      const existing = await Membership.findOne({ userId: u._id, workspaceId: ws._id });
      if (!existing) {
        await Membership.create({ userId: u._id, workspaceId: ws._id, role: 'owner' });
        createdMem++;
      }
    } else if (DRY) {
      const existing = ws ? await Membership.findOne({ userId: u._id, workspaceId: ws._id }).lean() : null;
      if (!existing) createdMem++;
    }

    // 3) проставить workspaceId + createdBy, где пусто
    for (const [name, Model] of MODELS) {
      const filter = { userId: u._id, $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] };
      if (DRY) {
        counters[name] += await Model.countDocuments(filter);
      } else if (ws) {
        const res = await Model.updateMany(filter, { $set: { workspaceId: ws._id, createdBy: u._id } });
        counters[name] += res.modifiedCount;
        linked += res.modifiedCount;
      }
    }
  }

  // 4) Удалить старые userId-индексы (заменены на workspaceId-составные). Идемпотентно.
  const db = mongoose.connection.db;
  const idxPlan = {
    tasks: ['userId_1_statusId_1_order_1', 'userId_1_recurrence.type_1', 'userId_1_dueDate_1'],
    occurrences: ['userId_1', 'userId_1_status_1_dueAt_1'],
    articles: ['userId_1_createdAt_-1', 'userId_1_title_1'],
    status: ['userId_1', 'userId_1_order_1'],
  };
  for (const [coll, names] of Object.entries(idxPlan)) {
    const existing = (await db.collection(coll).indexes()).map((i) => i.name);
    for (const name of names) {
      if (existing.includes(name)) {
        if (DRY) { console.log(`[dry] drop ${coll}.${name}`); }
        else { await db.collection(coll).dropIndex(name); console.log(`drop ${coll}.${name}`); }
      }
    }
  }

  console.log('workspaces создано:', createdWs);
  console.log('memberships создано:', createdMem);
  MODELS.forEach(([n]) => console.log(`${n}: обновлено ${counters[n]}`));
  if (!DRY) console.log('всего linked:', linked);
  console.log(DRY ? '=== DRY-RUN завершён ===' : '=== готово ===');

  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
