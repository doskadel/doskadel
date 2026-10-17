require('dotenv').config();
const mongoose = require('mongoose');
const TEST_URI = process.env.TEST_MONGODB_URI ||
  (process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel').replace(/\/[^/?]+(\?|$)/, '/doskadel_test$1');

let Task, Status;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  Task = require('../Task');
  Status = require('../Status');
});

afterAll(async () => { await mongoose.disconnect(); });

afterEach(async () => {
  const cols = await mongoose.connection.db.collections();
  for (const c of cols) await c.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

const makeStatus = (ws) => Status.create({ workspaceId: ws, userId: oid(), name: 'A', isFinal: false, key: 'k' + Date.now() + Math.random() });

describe('Task description (hybrid storage)', () => {
  test('json: сохраняется и читается как Mixed, format=json', async () => {
    const ws = oid();
    const st = await makeStatus(ws);
    const json = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] };
    const t = await Task.create({
      workspaceId: ws, userId: oid(), statusId: st._id, title: 'T',
      description: 'hi', descriptionJson: json, descriptionFormat: 'json',
    });
    const found = await Task.findById(t._id).lean();
    expect(found.descriptionFormat).toBe('json');
    expect(found.descriptionJson).toEqual(json);
    expect(found.description).toBe('hi');
  });

  test('legacy: без json — format=md по умолчанию', async () => {
    const ws = oid();
    const st = await makeStatus(ws);
    const t = await Task.create({
      workspaceId: ws, userId: oid(), statusId: st._id, title: 'L', description: 'plain text',
    });
    const found = await Task.findById(t._id).lean();
    expect(found.descriptionFormat).toBe('md');
    expect(found.descriptionJson).toBe(null);
    expect(found.description).toBe('plain text');
  });

  test('update: замена json сохраняется', async () => {
    const ws = oid();
    const st = await makeStatus(ws);
    const t = await Task.create({ workspaceId: ws, userId: oid(), statusId: st._id, title: 'U', description: 'a' });
    const newJson = { type: 'doc', content: [{ type: 'paragraph' }] };
    await Task.findByIdAndUpdate(t._id, { descriptionJson: newJson, descriptionFormat: 'json', description: 'b' });
    const found = await Task.findById(t._id).lean();
    expect(found.descriptionJson).toEqual(newJson);
    expect(found.descriptionFormat).toBe('json');
  });
});
