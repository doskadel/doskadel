const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const Task = require('../src/models/Task');
  const Status = require('../src/models/Status');
  const t = await Task.findOne({ closedReason: 'split' }).lean();
  if (t) {
    const st = await Status.findById(t.statusId).lean();
    console.log('split task status:', st ? `${st.name} isFinal=${st.isFinal}` : 'статус не найден');
  } else console.log('split-задач нет');
  await mongoose.disconnect();
})();
