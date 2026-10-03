const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { startAgenda } = require('./src/agenda');

const app = express();
app.set('trust proxy', 1);
app.set('etag', false); // API не кэшируем: 304 ломал данные в браузере
// Запрет кэша для всех ответов API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100
});
app.use(limiter);

// Строгий лимит на авторизацию (защита от брутфорса пароля)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 10,
  message: { success: false, message: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/doskadel');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

let agendaInstance = null;
let isShuttingDown = false;

const startServer = async () => {
  await connectDB();
  agendaInstance = await startAgenda();

  app.get('/', (req, res) => {
    res.json({ message: 'DoskaDel Backend API' });
  });

  app.use('/api/auth', require('./src/routes/auth'));
  app.use('/api/statuses', require('./src/routes/statuses'));
  app.use('/api/tasks', require('./src/routes/tasks'));
  app.use('/api/articles', require('./src/routes/articles'));
  app.use('/api/search', require('./src/routes/search'));
  app.use('/api/dashboard', require('./src/routes/dashboard'));
  app.use('/api/occurrences', require('./src/routes/occurrences'));
  app.use('/api/push', require('./src/routes/push'));
  app.use('/api/users', require('./src/routes/users'));
  app.use('/api/settings', require('./src/routes/settings'));

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
  });

  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${signal} received, shutting down gracefully...`);
  try {
    if (agendaInstance) {
      await agendaInstance.stop();
      console.log('Agenda stopped');
    }
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (e) {
    console.error('Shutdown error:', e);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;