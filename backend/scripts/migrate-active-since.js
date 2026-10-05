// F1f: миграция Task.activeSince = createdAt для задач, где activeSince не задан.
// Запуск: node scripts/migrate-active-since.js          — dry-run (только счёт)
//         node scripts/migrate-active-since.js --apply   — применить
require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../src/models/Task');

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');

  const filter = { $or: [{ activeSince: null }, { activeSince: { $exists: false } }] };
  const total = await Task.countDocuments(filter);
  console.log('Задач без activeSince:', total, apply ? '(ПРИМЕНЯЮ)' : '(dry-run)');

  if (apply && total > 0) {
    const tasks = await Task.find(filter).select('_id createdAt').lean();
    let done = 0;
    for (const t of tasks) {
      await Task.updateOne({ _id: t._id }, { $set: { activeSince: t.createdAt || new Date() } });
      done++;
    }
    console.log('Обновлено:', done);
  } else if (!apply) {
    console.log('Для применения: --apply');
  }
  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
