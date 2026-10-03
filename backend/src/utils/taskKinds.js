// Единые условия «разовая / повторяющаяся» (R1).
// Задача считается разовой, если recurrence отсутствует ИЛИ null (старые записи).
// Раньше встречались оба варианта (recurrence:null vs $exists:false) — расходились.

const SINGLE = { $or: [{ recurrence: null }, { 'recurrence.freq': { $exists: false } }] };
const RECURRING = { 'recurrence.freq': { $exists: true, $ne: null } };

function isRecurring(task) {
  return !!(task && task.recurrence && task.recurrence.freq);
}

module.exports = { SINGLE, RECURRING, isRecurring };
