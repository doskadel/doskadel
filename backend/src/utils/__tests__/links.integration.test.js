require('dotenv').config();
const mongoose = require('mongoose');
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

let EntityLink;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  EntityLink = require('../../models/EntityLink');
  await EntityLink.syncIndexes();
});
afterAll(async () => { await mongoose.disconnect(); });
afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const make = (ws, aType, aId, bType, bId) => EntityLink.create({ workspaceId: ws, aType, aId, bType, bId, createdBy: oid() });

describe('EntityLink (integration)', () => {
  test('дубль пары (A-B и B-A) невозможен (unique)', async () => {
    const ws = oid();
    const t = oid(); const ar = oid();
    await make(ws, 'task', t, 'article', ar);
    await expect(make(ws, 'task', t, 'article', ar)).rejects.toThrow();
  });

  test('связь видна с обеих сторон ($or по двум парам)', async () => {
    const ws = oid();
    const t = oid(); const ar = oid();
    await make(ws, 'article', ar, 'task', t);
    const byTask = await EntityLink.find({ workspaceId: ws, $or: [{ aType: 'task', aId: t }, { bType: 'task', bId: t }] }).lean();
    expect(byTask.length).toBe(1);
    const byArticle = await EntityLink.find({ workspaceId: ws, $or: [{ aType: 'article', aId: ar }, { bType: 'article', bId: ar }] }).lean();
    expect(byArticle.length).toBe(1);
  });

  test('изоляция workspace', async () => {
    const ws1 = oid(); const ws2 = oid();
    const t = oid(); const ar = oid();
    await make(ws1, 'task', t, 'article', ar);
    const inWs2 = await EntityLink.find({ workspaceId: ws2 }).lean();
    expect(inWs2.length).toBe(0);
  });
});
