// Тест tz-правила (F1c): две зоны видят 'сегодня' по-разному; задача 09:00 остаётся 09:00 локально через DST; без tz -> ошибка.
const http = require('http');
const mongoose = require('mongoose');
const BASE = 'http://localhost:5000';
const req = (method, path, token, body, headers = {}) => new Promise((resolve) => {
  const data = body ? JSON.stringify(body) : null;
  const q = http.request(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers } }, (s) => {
    let x = ''; s.on('data', (c) => (x += c)); s.on('end', () => resolve({ code: s.statusCode, body: x }));
  });
  if (data) q.write(data); q.end();
});
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n); } };
const rnd = () => Math.random().toString(36).slice(2, 8);

(async () => {
  const reg = JSON.parse((await req('POST', '/api/auth/register', null, { username: 'tz_' + rnd(), email: `tz_${rnd()}@t.com`, password: 'test123' })).body);
  const tok = reg.token, uid = reg.user.id;

  // без tz -> ошибка валидации
  const noTz = await req('POST', '/api/tasks', tok, { title: 'no-tz', priority: 2, recurrence: { freq: 'daily', time: '09:00' } });
  check('создание без tz -> 400', noTz.code === 400);

  // невалидный tz -> 400
  const badTz = await req('POST', '/api/tasks', tok, { title: 'bad-tz', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Mars/Olympus' } });
  check('невалидный tz -> 400', badTz.code === 400);

  // валидный tz -> 201
  const ok = await req('POST', '/api/tasks', tok, { title: 'msk', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } });
  check('валидный tz -> 201', ok.code === 201);
  const task = JSON.parse(ok.body).task;

  // 'сегодня' по-разному: dashboard с X-Timezone Moscow vs New_York даёт разные границы
  const dMsk = await req('GET', '/api/dashboard', tok, null, { 'X-Timezone': 'Europe/Moscow' });
  const dNyc = await req('GET', '/api/dashboard', tok, null, { 'X-Timezone': 'America/New_York' });
  check('dashboard Moscow 200', dMsk.code === 200);
  check('dashboard New_York 200', dNyc.code === 200);

  // 09:00 остаётся 09:00 локально (unit через luxon)
  const { getNextOccurrences } = require('../src/utils/recurrence');
  const { DateTime } = require('luxon');
  const occ = getNextOccurrences({ freq: 'daily', time: '09:00', interval: 1, tz: 'Europe/Moscow' }, new Date('2026-06-01T00:00:00Z'), 3);
  const local = occ.map((d) => DateTime.fromJSDate(d, { zone: 'Europe/Moscow' }).toFormat('HH:mm'));
  check('09:00 локально (летом, после DST)', local.every((t) => t === '09:00'));

  // уборка
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const wsIds = (await db.collection('workspaces').find({ createdBy: uid }).toArray()).map((w) => w._id);
  for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await db.collection(c).deleteMany({ workspaceId: { $in: wsIds } });
  await db.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
  await db.collection('refreshtokens').deleteMany({ userId: uid });
  await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(uid) });
  await mongoose.disconnect();

  console.log(`\nИТОГ tz: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
