const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}, { projection: { username: 1, email: 1 } }).toArray();
  console.log('users:', users.length);
  users.forEach((u) => console.log('  ', u.username, u.email));
  console.log('workspaces:', await db.collection('workspaces').countDocuments());
  console.log('memberships:', await db.collection('memberships').countDocuments());
  const byWs = await db.collection('status').aggregate([{ $group: { _id: '$workspaceId', n: { $sum: 1 } } }]).toArray();
  console.log('status по workspace:');
  byWs.forEach((s) => console.log('  ', String(s._id), s.n));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
