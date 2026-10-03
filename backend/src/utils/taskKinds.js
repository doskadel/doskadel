// Единые условия «разовая / повторяющаяся» (R1).
// Задача считается разовой, если recurrence отсутствует ИЛИ null (старые записи).
// Раньше встречались оба варианта (recurrence:null vs $exists:false) — расходились.

const SINGLE = { $or: [{ recurrence: null }, { 'recurrence.type': { $exists: false } }] };
const RECURRING = { 'recurrence.type': { $exists: true, $ne: null } };

function isRecurring(task) {
  return !!(task && task.recurrence && task.recurrence.type);
}

module.exports = { SINGLE, RECURRING, isRecurring };
