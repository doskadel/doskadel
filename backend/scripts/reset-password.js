// P3 (временно, личное): сброс пароля по email из CLI.
// Запуск: docker compose exec backend node scripts/reset-password.js <email> <новый-пароль>
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');

(async () => {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Использование: node scripts/reset-password.js <email> <новый-пароль>');
    process.exit(1);
  }
  if (newPassword.length < 10) {
    console.error('Пароль минимум 10 символов');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { console.error('Пользователь не найден:', email); process.exit(1); }
  user.password = newPassword;
  await user.save();
  // отзываем все refresh-сессии
  await RefreshToken.deleteMany({ userId: user._id });
  console.log('Пароль сброшен для', user.email, '; все сессии отозваны.');
  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
