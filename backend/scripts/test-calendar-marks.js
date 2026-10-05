// Тест F1d: /api/tasks/calendar-marks - маркеры дней (невыполненные задачи/вхождения).
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
  const reg = JSON.parse((await req('POST', '/api/auth/register', null, { username: 'cm_' + rnd(), email: `cm_${rnd()}@t.com`, password: 'test123' })).body);
  const tok = reg.token, uid = reg.user.id;

  // разовая с dueDate
  const single = JSON.parse((await req('POST', '/api/tasks', tok, { title: 'single', priority: 2, dueDate: '2026-10-20T09:00:00.000Z' })).body).task;
  // повторяющаяся daily
  await req('POST', '/api/tasks', tok, { title: 'rec', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } });

  const marks = JSON.parse((await req('GET', '/api/tasks/calendar-marks?from=2026-10-19&to=2026-10-22', tok)).body);
  check('marks 200 и days', marks.success && Array.isArray(marks.days));
  check('день разовой (2026-10-20) есть', marks.days.includes('2026-10-20'));
  check('itemByDay содержит разовую', (marks.itemsByDay['2026-10-20'] || []).some((i) => !i.isRecurring));
  check('повторяющаяся даёт маркеры без БД', (marks.itemsByDay['2026-10-21'] || []).some((i) => i.isRecurring));

  // финальная задача не даёт маркер
  const sts = JSON.parse((await req('GET', '/api/statuses', tok)).body).statuses;
  const finalId = sts.find((s) => s.isFinal)._id;
  await req('PUT', `/api/tasks/${single._id}`, tok, { statusId: finalId });
  const marks2 = JSON.parse((await req('GET', '/api/tasks/calendar-marks?from=2026-10-19&to=2026-10-22', tok)).body);
  check('финальная разовая не даёт маркер', !(marks2.itemsByDay['2026-10-20'] || []).some((i) => !i.isRecurring));

  // уборка
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const wsIds = (await db.collection('workspaces').find({ createdBy: uid }).toArray()).map((w) => w._id);
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: { $in: wsIds } });
  await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
  await db.collection('refreshtokens').deleteMany({ userId: uid });
  await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(uid) });
  await mongoose.disconnect();

  console.log(`\nИТОГ calendar-marks: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
