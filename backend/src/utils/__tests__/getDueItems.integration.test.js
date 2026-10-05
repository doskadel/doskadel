require('dotenv').config();
const mongoose = require('mongoose');
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

let Task, Status, Occurrence, getDueItems;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  Task = require('../../models/Task');
  Status = require('../../models/Status');
  Occurrence = require('../../models/Occurrence');
  ({ getDueItems } = require('../dueItems'));
});

afterAll(async () => { await mongoose.disconnect(); });

afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('getDueItems (integration)', () => {
  test('single: разовая задача в окне и без нотификации', async () => {
    const ws = oid();
    const st = await Status.create({ workspaceId: ws, userId: oid(), name: 'A', isFinal: false, key: 'k' + Date.now() });
    await Task.create({
      workspaceId: ws, userId: oid(), statusId: st._id, title: 'Разовая',
      dueDate: new Date('2026-10-05T12:00:00Z'),
    });
    const res = await getDueItems('single', 'atDue',
      { gte: new Date('2026-10-05T00:00:00Z'), lt: new Date('2026-10-06T00:00:00Z') },
      { activeStatusIds: [st._id] });
    expect(res.length).toBe(1);
    expect(res[0].title).toBe('Разовая');
    expect(res[0].source).toBe('single');
  });

  test('single: уже уведомлённая (atDue) не возвращается', async () => {
    const ws = oid();
    const st = await Status.create({ workspaceId: ws, userId: oid(), name: 'A', isFinal: false, key: 'k' + Date.now() });
    await Task.create({
      workspaceId: ws, userId: oid(), statusId: st._id, title: 'Уже',
      dueDate: new Date('2026-10-05T12:00:00Z'),
      notificationsSent: { atDue: new Date() },
    });
    const res = await getDueItems('single', 'atDue',
      { gte: new Date('2026-10-05T00:00:00Z'), lt: new Date('2026-10-06T00:00:00Z') },
      { activeStatusIds: [st._id] });
    expect(res.length).toBe(0);
  });

  test('occurrence: повторяющаяся материализуется и возвращается', async () => {
    const ws = oid();
    const st = await Status.create({ workspaceId: ws, userId: oid(), name: 'A', isFinal: false, key: 'k' + Date.now() });
    await Task.create({
      workspaceId: ws, userId: oid(), statusId: st._id, title: 'Повтор',
      recurrence: { freq: 'daily', interval: 1, time: '09:00', tz: 'Europe/Moscow' },
      createdAt: new Date('2026-10-01T00:00:00Z'),
    });
    const res = await getDueItems('occurrence', 'atDue',
      { gte: new Date('2026-10-05T00:00:00Z'), lt: new Date('2026-10-06T00:00:00Z') },
      { workspaceId: ws, activeStatusIds: [st._id], floorDays: 0 });
    expect(res.length).toBe(1);
    expect(res[0].requiresConfirm).toBe(true);
    // запись материализована в Occurrence
    const cnt = await Occurrence.countDocuments({ workspaceId: ws });
    expect(cnt).toBeGreaterThanOrEqual(1);
  });
});
