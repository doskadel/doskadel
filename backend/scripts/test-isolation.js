// Тест изоляции workspace (шаг 5).
// Запуск (в контейнере backend): node scripts/test-isolation.js
// Проверяет: A не читает/меняет/удаляет данные B; подмена workspaceId в теле игнорируется;
// чужой X-Workspace-Id -> 404; создание проставляет workspaceId.
const http = require('http');
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000';
const req = (method, path, token, body) => new Promise((resolve) => {
  const data = body ? JSON.stringify(body) : null;
  const q = http.request(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  }, (s) => {
    let x = '';
    s.on('data', (c) => (x += c));
    s.on('end', () => resolve({ code: s.statusCode, body: x }));
  });
  if (data) q.write(data);
  q.end();
});

const rnd = () => Math.random().toString(36).slice(2, 8);
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  OK  ', name); } else { fail++; console.log('  FAIL', name); } };

(async () => {
  // Авто-очистка старых тестовых пользователей от прошлых (возможно упавших) прогонов
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const dbc = mongoose.connection.db;
  const stale = await dbc.collection('users').find({ username: { $regex: /^(iso_|dbg_)/ } }).toArray();
  for (const u of stale) {
    const wsIds = (await dbc.collection('workspaces').find({ createdBy: u._id }).toArray()).map((w) => w._id);
    for (const c of ['tasks', 'occurrences', 'articles', 'status', 'memberships']) await dbc.collection(c).deleteMany({ workspaceId: { $in: wsIds } });
    await dbc.collection('workspaces').deleteMany({ _id: { $in: wsIds } });
    await dbc.collection('refreshtokens').deleteMany({ userId: u._id });
    await dbc.collection('users').deleteOne({ _id: u._id });
  }
  await mongoose.disconnect();

  const A = { username: 'iso_a_' + rnd(), email: `iso_a_${rnd()}@t.com`, password: 'test123' };
  const B = { username: 'iso_b_' + rnd(), email: `iso_b_${rnd()}@t.com`, password: 'test123' };

  const regA = JSON.parse((await req('POST', '/api/auth/register', null, A)).body);
  const regB = JSON.parse((await req('POST', '/api/auth/register', null, B)).body);
  const tokA = regA.token, tokB = regB.token;
  console.log('users registered:', !!tokA, !!tokB);

  // A создаёт задачу; B создаёт задачу
  const tA = JSON.parse((await req('POST', '/api/tasks', tokA, { title: 'A-task', priority: 2 })).body).task;
  const tB = JSON.parse((await req('POST', '/api/tasks', tokB, { title: 'B-task', priority: 2 })).body).task;
  check('A create has workspaceId', !!tA.workspaceId);
  check('B create has workspaceId', !!tB.workspaceId);

  // A видит только свои
  const listA = JSON.parse((await req('GET', '/api/tasks', tokA)).body).tasks;
  check('A sees only own task', listA.length === 1 && String(listA[0]._id) === String(tA._id));

  // A не читает задачу B по id -> 404
  const getB = await req('GET', `/api/tasks/${tB._id}`, tokA);
  check('A get B task -> 404', getB.code === 404);

  // A не меняет задачу B -> 404
  const updB = await req('PUT', `/api/tasks/${tB._id}`, tokA, { title: 'hacked' });
  check('A update B task -> 404', updB.code === 404);

  // A не удаляет задачу B -> 404
  const delB = await req('DELETE', `/api/tasks/${tB._id}`, tokA);
  check('A delete B task -> 404', delB.code === 404);

  // Подмена workspaceId в теле при создании игнорируется (создаётся в своём ws)
  const tInj = JSON.parse((await req('POST', '/api/tasks', tokA, { title: 'inject', priority: 1, workspaceId: tB.workspaceId })).body).task;
  check('body workspaceId ignored (own ws)', String(tInj.workspaceId) === String(tA.workspaceId));

  // Чужой X-Workspace-Id -> 404
  const foreign = await new Promise((resolve) => {
    const q = http.request(BASE + '/api/tasks', { headers: { Authorization: 'Bearer ' + tokA, 'X-Workspace-Id': String(tB.workspaceId) } }, (s) => {
      let x=''; s.on('data',c=>x+=c); s.on('end',()=>resolve({code:s.statusCode}));
    });
    q.end();
  });
  check('A with B X-Workspace-Id -> 404', foreign.code === 404);

  // Search: A не видит задачи B
  const sA = JSON.parse((await req('GET', '/api/search?q=B-task', tokA)).body);
  check('A search does not see B task', sA.results.tasks.length === 0);

  // Dashboard: A видит только свои, не B (точное число не фиксируем)
  const dA = JSON.parse((await req('GET', '/api/dashboard', tokA)).body).dashboard;
  const dAIds = (dA.recentTasks || []).map((t) => String(t._id));
  check('A dashboard does not contain B task', !dAIds.includes(String(tB._id)));

  // Occurrence наследует workspaceId задачи (повторяющаяся)
  const recTask = JSON.parse((await req('POST', '/api/tasks', tokA, { title: 'A-rec', priority: 2, recurrence: { freq: 'daily', time: '09:00', tz: 'Europe/Moscow' } })).body).task;
  await new Promise(r => setTimeout(r, 500));
  // Вхождения считаются на лету (F1c): проверяем через getDueItems в широком окне (floor 0)
  const mongooseEarly = require('mongoose');
  await mongooseEarly.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const { getDueItems: gdi } = require('../src/utils/dueItems');
  const occs = await gdi('occurrence', 'beforeDue', { gte: new Date(Date.now() - 1000), lt: new Date(Date.now() + 40 * 24 * 3600 * 1000) }, { floorDays: 0 });
  const ownOcc = occs.filter((o) => String(o.taskId) === String(recTask._id));
  check('вхождения A считаются и с workspaceId A', ownOcc.length > 0);
  await mongooseEarly.disconnect();
  await req('DELETE', `/api/tasks/${recTask._id}`, tokA);

  // taskDueSummary/dueItems не отдают чужое (unit, на данных A/B)
  const mongooseLib = require('mongoose');
  await mongooseLib.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const { summarizeOccurrences } = require('../src/utils/taskDueSummary');
  const { getDueItems } = require('../src/utils/dueItems');
  // summarizeOccurrences принимает задачи; без recurrence (разовые) вернёт пусто
  const summaryB = await summarizeOccurrences(tB.workspaceId, []);
  check('taskDueSummary: пустой список задач -> пусто', summaryB.size === 0);
  // узкое окно (не epoch!), чтобы не материализовать лишние вхождения
  const occB = await getDueItems('occurrence', 'beforeDue', { gte: new Date(Date.now() - 60000), lt: new Date(Date.now() + 60000) }, {});
  const foreignOcc = occB.filter((o) => String(o.taskId) === String(tB._id));
  check('dueItems: нет вхождений B-задачи', foreignOcc.length === 0);
  await mongooseLib.disconnect();

  // Уборка: удалить тестовые задачи и пользователей
  await req('DELETE', `/api/tasks/${tA._id}`, tokA);
  await req('DELETE', `/api/tasks/${tInj._id}`, tokA);
  await req('DELETE', `/api/tasks/${tB._id}`, tokB);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const User = require('../src/models/User');
  const Workspace = require('../src/models/Workspace');
  const Membership = require('../src/models/Membership');
  const Status = require('../src/models/Status');
  const Task = require('../src/models/Task');
  const Occurrence = require('../src/models/Occurrence');
  const Article = require('../src/models/Article');
  for (const u of [regA.user.id, regB.user.id]) {
    const ws = await Workspace.find({ createdBy: u }).select('_id');
    const wsIds = ws.map((w) => w._id);
    // чистим ВСЁ, что осталось в этих workspace (задачи, вхождения, статьи, статусы, членства)
    await Task.deleteMany({ workspaceId: { $in: wsIds } });
    await Occurrence.deleteMany({ workspaceId: { $in: wsIds } });
    await Article.deleteMany({ workspaceId: { $in: wsIds } });
    await Status.deleteMany({ workspaceId: { $in: wsIds } });
    await Membership.deleteMany({ workspaceId: { $in: wsIds } });
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await User.findByIdAndDelete(u);
  }
  await mongoose.disconnect();

  console.log(`\nИТОГ: pass=${pass} fail=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
