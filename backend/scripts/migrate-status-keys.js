// Разовая миграция: проставить key существующим дефолтным статусам по названию.
// Запуск: node scripts/migrate-status-keys.js (в контейнере backend).
const mongoose = require('mongoose');
const Status = require('../src/models/Status');

const MAP = {
  'В ожидании': 'pending',
  'В работе': 'in_progress',
  'Выполнено': 'done',
  'Отменено': 'cancelled',
};

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel';
  await mongoose.connect(uri);
  let updated = 0;
  for (const [name, key] of Object.entries(MAP)) {
    // Ставим только тем, у кого key ещё не задан (idempotent)
    const res = await Status.updateMany(
      { name, key: null },
      { $set: { key } }
    );
    updated += res.modifiedCount;
    console.log(`${name} -> ${key}: ${res.modifiedCount}`);
  }
  console.log('total updated:', updated);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
