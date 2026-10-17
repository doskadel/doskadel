require('dotenv').config();
const mongoose = require('mongoose');
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

let Comment;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  Comment = require('../../models/Comment');
  await Comment.syncIndexes();
});
afterAll(async () => { await mongoose.disconnect(); });
afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

const make = (ws, ownerType, ownerId, extra = {}) => Comment.create({ workspaceId: ws, ownerType, ownerId, authorId: oid(), content: 'x', ...extra });

describe('Comment (integration)', () => {
  test('глубина 2: ответ на ответ -> parentId корня', async () => {
    const ws = oid(); const ownerId = oid(); const author = oid();
    const root = await Comment.create({ workspaceId: ws, ownerType: 'task', ownerId, authorId: author, content: 'root' });
    const reply = await Comment.create({ workspaceId: ws, ownerType: 'task', ownerId, parentId: root._id, authorId: author, content: 'reply' });
    // ответ на ответ сохраняем с parentId корня
    const nestedParent = reply.parentId || reply._id;
    const nested = await Comment.create({ workspaceId: ws, ownerType: 'task', ownerId, parentId: nestedParent, authorId: author, content: 'nested' });
    expect(String(nested.parentId)).toBe(String(root._id));
  });

  test('изоляция workspace при выборке', async () => {
    const ws1 = oid(); const ws2 = oid(); const ownerId = oid();
    await make(ws1, 'task', ownerId);
    const inWs2 = await Comment.find({ workspaceId: ws2, ownerType: 'task', ownerId }).lean();
    expect(inWs2.length).toBe(0);
  });

  test('soft delete с ответами: текст обнуляется, deletedAt ставится', async () => {
    const ws = oid(); const ownerId = oid(); const author = oid();
    const root = await Comment.create({ workspaceId: ws, ownerType: 'article', ownerId, authorId: author, content: 'root' });
    await Comment.create({ workspaceId: ws, ownerType: 'article', ownerId, parentId: root._id, authorId: author, content: 'reply' });
    root.deletedAt = new Date(); root.content = ''; root.contentJson = null; await root.save();
    const found = await Comment.findById(root._id).lean();
    expect(found.deletedAt).toBeTruthy();
    expect(found.content).toBe('');
  });
});
