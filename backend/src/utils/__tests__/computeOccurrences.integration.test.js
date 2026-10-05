require('dotenv').config();
const mongoose = require('mongoose');

// Отдельная тест-БД в том же Mongo (не трогает рабочую).
// Реальный сервер доступен по MONGODB_URI (в контейнере: mongodb://mongo:27017/doskadel).
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const Task = require('../../models/Task');
const Status = require('../../models/Status');
const { computeOccurrences } = require('../dueItems');

const oid = () => new mongoose.Types.ObjectId();

async function seed({ workspaceId, statusId, title, freq = 'daily', createdAt }) {
  return Task.create({
    workspaceId, userId: oid(), statusId, title,
    recurrence: { freq, interval: 1, time: '09:00', tz: 'Europe/Moscow' },
    createdAt,
  });
}

describe('computeOccurrences (integration)', () => {
  test('изоляция: задача одного workspace не попадает в запрос другого', async () => {
    const wsA = oid();
    const wsB = oid();
    const st = await Status.create({ workspaceId: wsA, userId: oid(), name: 'A', isFinal: false, key: 'a' + Date.now() });
    const stB = await Status.create({ workspaceId: wsB, userId: oid(), name: 'B', isFinal: false, key: 'b' + Date.now() });
    await seed({ workspaceId: wsA, statusId: st._id, title: 'A-задача', createdAt: new Date('2026-10-01T00:00:00Z') });
    await seed({ workspaceId: wsB, statusId: stB._id, title: 'B-задача', createdAt: new Date('2026-10-01T00:00:00Z') });

    const gte = new Date('2026-10-01T00:00:00Z');
    const lt = new Date('2026-10-11T00:00:00Z');
    const activeA = [st._id];
    const resA = await computeOccurrences({ gte, lt }, { workspaceId: wsA, activeStatusIds: activeA, floorDays: 0 });
    const titles = resA.map((o) => o.task.title);
    expect(titles).toContain('A-задача');
    expect(titles).not.toContain('B-задача');
  });

  test('финальный статус: вхождений нет', async () => {
    const ws = oid();
    const finalSt = await Status.create({ workspaceId: ws, userId: oid(), name: 'Done', isFinal: true, key: 'f' + Date.now() });
    await seed({ workspaceId: ws, statusId: finalSt._id, title: 'Финал', createdAt: new Date('2026-10-01T00:00:00Z') });
    const gte = new Date('2026-10-01T00:00:00Z');
    const lt = new Date('2026-10-11T00:00:00Z');
    // activeStatusIds не включает финальный — как в реальных вызовах
    const res = await computeOccurrences({ gte, lt }, { workspaceId: ws, activeStatusIds: [], floorDays: 0 });
    expect(res.length).toBe(0);
  });

  test('не раньше createdAt', async () => {
    const ws = oid();
    const st = await Status.create({ workspaceId: ws, userId: oid(), name: 'A', isFinal: false, key: 'x' + Date.now() });
    await seed({ workspaceId: ws, statusId: st._id, title: 'Поздняя', createdAt: new Date('2026-10-05T00:00:00Z') });
    const gte = new Date('2026-10-01T00:00:00Z');
    const lt = new Date('2026-10-06T00:00:00Z');
    const res = await computeOccurrences({ gte, lt }, { workspaceId: ws, activeStatusIds: [st._id], floorDays: 0 });
    // 05.10 09:00 MSK = 06:00 UTC — попадает; до 01-04.10 — не должно быть
    res.forEach((o) => {
      expect(o.dueAt.getTime()).toBeGreaterThanOrEqual(new Date('2026-10-05T00:00:00Z').getTime());
    });
  });
});
