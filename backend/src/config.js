// Единый источник секретов/конфига. Падаем при старте, если критичное не задано (в проде).
const IS_PROD = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const v = process.env[name];
  if (v) return v;
  if (IS_PROD) {
    throw new Error('[config] ' + name + ' не задан. Задайте его в .env (обязательно для прода).');
  }
  if (devFallback !== undefined) return devFallback;
  throw new Error('[config] ' + name + ' не задан.');
}

const JWT_SECRET = required('JWT_SECRET', 'doskadel_dev_secret_change_me');

module.exports = { JWT_SECRET, IS_PROD };
