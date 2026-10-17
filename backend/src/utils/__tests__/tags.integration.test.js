require('dotenv').config();
const mongoose = require('mongoose');
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

let Tag, Task;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  Tag = require('../../models/Tag');
  Task = require('../../models/Task');
  await Tag.syncIndexes();
});
afterAll(async () => { await mongoose.disconnect(); });
afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

const makeTag = (ws, name) => Tag.create({ workspaceId: ws, name, nameLower: name.toLowerCase(), createdBy: oid() });

describe('Tag (integration)', () => {
  test('unique nameLower в workspace', async () => {
    const ws = oid();
    await makeTag(ws, 'Работа');
    await expect(makeTag(ws, 'работа')).rejects.toThrow();
  });

  test('одинаковое имя в разных workspace допустимо', async () => {
    const ws1 = oid(); const ws2 = oid();
    await makeTag(ws1, 'Работа');
    await expect(makeTag(ws2, 'Работа')).resolves.toBeTruthy();
  });

  test('tagIds в Task + multikey выборка', async () => {
    const ws = oid();
    const t = await makeTag(ws, 'X');
    const st = new mongoose.Types.ObjectId();
    await Task.create({ workspaceId: ws, userId: oid(), statusId: st, title: 'T', tagIds: [t._id] });
    const found = await Task.find({ workspaceId: ws, tagIds: t._id }).lean();
    expect(found.length).toBe(1);
  });

  test('hard delete + $pull из Task', async () => {
    const ws = oid();
    const t = await makeTag(ws, 'Y');
    const task = await Task.create({ workspaceId: ws, userId: oid(), statusId: new mongoose.Types.ObjectId(), title: 'T', tagIds: [t._id] });
    await Tag.deleteOne({ _id: t._id });
    await Task.updateMany({ workspaceId: ws, tagIds: t._id }, { $pull: { tagIds: t._id } });
    const after = await Task.findById(task._id).lean();
    expect(after.tagIds.length).toBe(0);
  });
});
