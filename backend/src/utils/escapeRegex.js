// Экранирование спецсимволов regex в пользовательском вводе (защита от ReDoS/500).
const MAX_Q = 200;

function escapeRegex(s) {
  return String(s).slice(0, MAX_Q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
