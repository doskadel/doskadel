// Тест F1c этап 3: действия над вхождением (done/skip/undo/move), scope, split, завершение.
const http = require('http');
const mongoose = require('mongoose');
const BASE = 'http://localhost:5000';
const req = (method, path, token, body) => new Promise((resolve) => {
  const data = body ? JSON.stringify(body) : null;
  const q = http.request(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } }, (s) => {
    let x = ''; s.on('data', (c) => (x += c)); s.on('end', () => resolve({ code: s.statusCode, body: x }));
  });
  if (data) q.write(data); q.end();
});
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n); } };
const rnd = () => Math.random().toString(36).slice(2, 8);

(async () => {
  const reg = JSON.parse((await req('POST', '/api/auth/register', null, { username: 'act_' + rnd(), email: `act_${rnd()}@t.com`, password: 'test123' })).body);
  const tok = reg.token, uid = reg.user.id;
  // повторяющаяся daily
  const t = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'daily', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } })).body).task;
  const orig1 = new Date(Date.now() + 2 * 24 * 3600 * 1000); orig1.setUTCHours(9, 0, 0, 0);
  const orig2 = new Date(orig1.getTime() + 24 * 3600 * 1000);

  // done идемпотентно
  const d1 = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: orig1.toISOString(), action: 'done' });
  check('done -> 200', d1.code === 200);
  const d2 = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: orig1.toISOString(), action: 'done' });
  check('done twice -> 200 (идемпотентно)', d2.code === 200);

  // skip
  const s1 = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: orig2.toISOString(), action: 'skip' });
  check('skip -> 200', s1.code === 200);

  // чужой id -> 404
  const other = JSON.parse((await req('POST', '/api/auth/register', null, { username: 'oth_' + rnd(), email: `oth_${rnd()}@t.com`, password: 'test123' })).body);
  const foreign = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: new Date().toISOString(), action: 'done' });
  // своя задача -> ок; проверим чужой workspace не через action (там taskId), а через get
  const getForeign = await req('GET', `/api/tasks/${t._id}`, other.token);
  check('чужой task по id -> 404', getForeign.code === 404);

  // move this: вхождение с новым dueAt
  const orig3 = new Date(orig2.getTime() + 24 * 3600 * 1000);
  const mv = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: orig3.toISOString(), action: 'move', dueAt: new Date(orig3.getTime() + 2 * 3600 * 1000).toISOString(), scope: 'this' });
  check('move this -> 200', mv.code === 200);

  // split following
  const orig4 = new Date(orig3.getTime() + 24 * 3600 * 1000);
  const sp = await req('POST', '/api/occurrences/action', tok, { taskId: t._id, originalDate: orig4.toISOString(), action: 'move', dueAt: new Date(orig4.getTime() + 3600 * 1000).toISOString(), scope: 'following' });
  check('split following -> 200', sp.code === 200);

  // проверка БД: старая until, новая seriesId
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const Task = require('../src/models/Task');
  const oldT = await Task.findById(t._id).lean();
  check('старая: until установлен', !!oldT.recurrence.until);
  check('старая: closedReason=split', oldT.closedReason === 'split');
  const newT = await Task.findOne({ prevTaskId: t._id }).lean();
  check('новая Task-продолжение создана', !!newT);
  check('новая: seriesId = _id старой', newT && String(newT.seriesId) === String(t._id));

  // пересчёт count при split
  const t3 = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'counted', priority: 2, recurrence: { freq: 'daily', time: '09:00', count: 10, tz: 'Europe/Moscow' } })).body).task;
  const c1 = new Date(Date.now() + 2 * 24 * 3600 * 1000); c1.setUTCHours(9, 0, 0, 0);
  await req('POST', '/api/occurrences/action', tok, { taskId: t3._id, originalDate: new Date(c1.getTime() - 24 * 3600 * 1000).toISOString(), action: 'done' });
  const sp3 = await req('POST', '/api/occurrences/action', tok, { taskId: t3._id, originalDate: c1.toISOString(), action: 'move', dueAt: new Date(c1.getTime() + 3600 * 1000).toISOString(), scope: 'following' });
  check('split с count -> 200', sp3.code === 200);
  const newT3 = await Task.findOne({ prevTaskId: t3._id }).lean();
  check('count пересчитан (< 10)', newT3 && newT3.recurrence.count < 10);

  // following на первом вхождении = all (без split, та же задача)
  const t4 = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'first-split', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } })).body).task;
  const f1 = new Date(Date.now() + 3 * 24 * 3600 * 1000); f1.setUTCHours(9, 0, 0, 0);
  const beforeCount = await Task.countDocuments({ workspaceId: t4.workspaceId });
  const fp = await req('POST', '/api/occurrences/action', tok, { taskId: t4._id, originalDate: f1.toISOString(), action: 'move', dueAt: new Date(f1.getTime() + 3600 * 1000).toISOString(), scope: 'following' });
  const afterCount = await Task.countDocuments({ workspaceId: t4.workspaceId });
  check('following на первом = all (без новой Task)', fp.code === 200 && afterCount === beforeCount);

  // auto-missed: 3 просроченных pending -> 2 missed, последнее pending; не трогает с отправкой
  const { runAutoMissed } = require('../src/utils/autoMissed');
  const Occurrence = require('../src/models/Occurrence');
  const t5 = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'missed', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } })).body).task;
  const occs = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.now() - (3 - i) * 24 * 3600 * 1000);
    occs.push(await Occurrence.create({ taskId: t5._id, originalDate: d, dueAt: d, status: 'pending', workspaceId: t5.workspaceId, userId: t5.userId, createdBy: t5.userId }));
  }
  // одна с отправкой (не должна стать missed)
  const sent = occs[0];
  await Occurrence.updateOne({ _id: sent._id }, { $set: { 'notificationsSent.beforeDue': new Date() } });
  const dry = await runAutoMissed(true);
  check('auto-missed dry-run считает', dry >= 1);
  const marked = await runAutoMissed(false);
  const missedCount = await Occurrence.countDocuments({ taskId: t5._id, status: 'missed' });
  const pendingLeft = await Occurrence.countDocuments({ taskId: t5._id, status: 'pending' });
  check('auto-missed: помечено missed', missedCount >= 1);
  // pending остаются: последняя чистая (1) + запись с отправкой (1) = 2
  check('auto-missed: последнее чистое + с отправкой остались pending', pendingLeft === 2);
  const sentStill = await Occurrence.findById(sent._id).lean();
  check('auto-missed: с отправкой не стал missed', sentStill.status === 'pending');

  // история по seriesId: обе части серии
  const seriesTasks = await Task.find({ seriesId: t._id }).lean();
  check('история seriesId: >= 2 части', seriesTasks.length >= 2);
  check('все части с одним seriesId', seriesTasks.every((x) => String(x.seriesId) === String(t._id)));

  // Завершить повторение (бессрочная серия -> финальный статус)
  const t6 = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'endless', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } })).body).task;
  const comp = await req('POST', '/api/occurrences/complete-series', tok, { taskId: t6._id });
  check('complete-series -> 200', comp.code === 200);
  const t6after = await Task.findById(t6._id).lean();
  check('complete-series: closedReason=manual', t6after && t6after.closedReason === 'manual');

  // уборка
  const db = mongoose.connection.db;
  const wsIds = (await db.collection('workspaces').find({ createdBy: uid }).toArray()).map((w) => w._id);
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: { $in: wsIds } });
  await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
  await db.collection('refreshtokens').deleteMany({ userId: uid });
  await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(uid) });
  const otherUid = other.user.id;
  const ows = (await db.collection('workspaces').find({ createdBy: otherUid }).toArray()).map((w) => w._id);
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: { $in: ows } });
  await db.collection('workspaces').deleteMany({ _id: { $in: ows } });
  await db.collection('refreshtokens').deleteMany({ userId: otherUid });
  await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(otherUid) });
  await mongoose.disconnect();

  console.log(`\nИТОГ actions: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
