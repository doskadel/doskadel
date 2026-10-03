const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  console.log('users:', await db.collection('users').countDocuments());
  const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
  console.log('usernames:', users.map((u) => u.username).join(', '));
  console.log('tasks:', await db.collection('tasks').countDocuments(), '| с freq:', await db.collection('tasks').countDocuments({ 'recurrence.freq': { $exists: true } }));
  console.log('workspaces:', await db.collection('workspaces').countDocuments());
  await mongoose.disconnect();
})();
