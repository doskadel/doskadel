// Тест компенсации split при сбое (F1c этап 3, хвост 1а).
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const Task = require('../src/models/Task');
  const Workspace = require('../src/models/Workspace');
  const Membership = require('../src/models/Membership');
  const Status = require('../src/models/Status');
  const Occurrence = require('../src/models/Occurrence');
  const User = require('../src/models/User');

  let pass = 0, fail = 0;
  const check = (n, c) => { if (c) { pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n); } };

  // создаём пользователя/workspace/статусы напрямую
  const u = await User.create({ username: 'sf_' + Date.now(), email: `sf_${Date.now()}@t.com`, password: 'test123' });
  const ws = await Workspace.create({ name: 'Личное', isPersonal: true, createdBy: u._id });
  await Membership.create({ userId: u._id, workspaceId: ws._id, role: 'owner' });
  const st = await Status.create({ workspaceId: ws._id, userId: u._id, createdBy: u._id, name: 'В ожидании', color: '#9ca3af', order: 0, isFinal: false });

  const orig = new Date(Date.now() + 3 * 24 * 3600 * 1000); orig.setUTCHours(9, 0, 0, 0);
  const t = await Task.create({
    title: 'split-fail', priority: 2, statusId: st._id, order: 0,
    workspaceId: ws._id, userId: u._id, createdBy: u._id,
    recurrence: { freq: 'daily', interval: 1, time: '09:00', tz: 'Europe/Moscow' },
  });
  // вхождение до orig (чтобы following пошёл в split, не all)
  const before = new Date(orig.getTime() - 24 * 3600 * 1000);
  await Occurrence.create({ taskId: t._id, originalDate: before, dueAt: before, status: 'done', completedAt: new Date(), workspaceId: ws._id, userId: u._id, createdBy: u._id });

  // monkey-patch: заставим save старой Task упасть (по closedReason)
  const origSave = Task.prototype.save;
  Task.prototype.save = async function (...a) {
    if (this.closedReason === 'split') throw new Error('simulated failure at close-old');
    return origSave.apply(this, a);
  };

  const { splitSeriesTest } = require('../src/controllers/occurrenceActionsController');
  let threw = false;
  try {
    await splitSeriesTest(t, orig, new Date(orig.getTime() + 3600 * 1000));
  } catch (e) {
    threw = true;
  }
  Task.prototype.save = origSave;

  check('split упал (ожидаемо)', threw);
  // компенсация: не осталось новой Task (prevTaskId=t._id)
  const orphan = await Task.findOne({ prevTaskId: t._id }).lean();
  check('компенсация: новая Task удалена', !orphan);
  // старая не закрыта (closedReason не split)
  const oldT = await Task.findById(t._id).lean();
  check('компенсация: старая не закрыта', oldT.closedReason !== 'split');

  // уборка
  const db = mongoose.connection.db;
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: ws._id });
  await db.collection('workspaces').deleteOne({ _id: ws._id });
  await db.collection('users').deleteOne({ _id: u._id });

  console.log(`\nИТОГ split-fail: pass=${pass} fail=${fail}`);
  await mongoose.disconnect();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
