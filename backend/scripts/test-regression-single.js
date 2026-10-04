// Регрессия разовых задач (F1c этап 1): dueDate, taskDueSummary, dashboard, создание/смена dueDate.
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
  const reg = JSON.parse((await req('POST', '/api/auth/register', null, { username: 'single_' + rnd(), email: `single_${rnd()}@t.com`, password: 'test123' })).body);
  const tok = reg.token, uid = reg.user.id;

  // Разовая задача с dueDate
  const t = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'Single', priority: 2, dueDate: '2026-10-20T12:00:00.000Z' })).body).task;
  check('разовая создана', !!t._id && !t.recurrence?.freq);
  check('dueDate сохранён', String(t.dueDate).startsWith('2026-10-20'));

  // taskDueSummary (через /api/tasks обогащение)
  const list = JSON.parse((await req('GET', '/api/tasks', tok)).body).tasks;
  const got = list.find((x) => String(x._id) === String(t._id));
  check('разовая в списке, nextOccurrenceDueAt=dueDate', got && String(got.nextOccurrenceDueAt).startsWith('2026-10-20'));
  check('разовая pendingOccurrenceCount=0', got && got.pendingOccurrenceCount === 0);

  // Смена dueDate разовой (F1b путь)
  const upd = await req('PUT', `/api/tasks/${t._id}`, tok, { dueDate: '2026-10-21T12:00:00.000Z' });
  check('смена dueDate разовой -> 200', upd.code === 200);

  // dashboard
  const d = JSON.parse((await req('GET', '/api/dashboard', tok)).body).dashboard;
  check('dashboard содержит разовую', (d.recentTasks || []).some((x) => String(x._id) === String(t._id)));

  // Уборка
  await req('DELETE', `/api/tasks/${t._id}`, tok);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const wsIds = (await db.collection('workspaces').find({ createdBy: uid }).toArray()).map((w) => w._id);
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: { $in: wsIds } });
  await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
  await db.collection('refreshtokens').deleteMany({ userId: uid });
  await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(uid) });
  await mongoose.disconnect();

  console.log(`\nИТОГ regression-single: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
