// F1c этап 3: действия над вхождением повторяющейся задачи.
// done / skip / undo / move. Идемпотентно по {taskId, originalDate}, can(), workspace из контекста.
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Occurrence = require('../models/Occurrence');
const { canByMembership } = require('../utils/can');

const isValidId = (v) => mongoose.Types.ObjectId.isValid(v);

/** Найти задачу в workspace. */
async function findTask(taskId, workspaceId) {
  return Task.findOne({ _id: taskId, workspaceId });
}

/** upsert вхождения по ключу {taskId, originalDate}. */
async function upsertOccurrence(task, originalDate, set = {}) {
  // $setOnInsert — только поля, которых НЕТ в $set (иначе конфликт "Updating the path...").
  // status/completedAt всегда идут через $set (при insert дефолт 'pending' через setDefaultsOnInsert).
  const setOnInsert = {
    taskId: task._id,
    originalDate,
    workspaceId: task.workspaceId,
    userId: task.userId,
    createdBy: task.createdBy || task.userId,
  };
  if (set.dueAt === undefined) setOnInsert.dueAt = originalDate;
  return Occurrence.findOneAndUpdate(
    { taskId: task._id, originalDate },
    {
      $setOnInsert: setOnInsert,
      $set: { status: 'pending', ...set },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/** POST /api/occurrences/action  { taskId, originalDate, action: done|skip|undo, dueAt? } */
const action = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { taskId, originalDate, action: act, dueAt } = req.body;
    if (!isValidId(taskId) || !originalDate) return res.status(400).json({ success: false, message: 'taskId and originalDate required' });
    const orig = new Date(originalDate);
    if (isNaN(orig.getTime())) return res.status(400).json({ success: false, message: 'Invalid originalDate' });

    const task = await findTask(taskId, req.workspaceId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    let occ;
    if (act === 'done') {
      occ = await upsertOccurrence(task, orig, { status: 'done', completedAt: new Date(), completedBy: req.user._id });
    } else if (act === 'skip') {
      occ = await upsertOccurrence(task, orig, { status: 'skipped', completedAt: new Date(), completedBy: req.user._id });
    } else if (act === 'undo') {
      occ = await upsertOccurrence(task, orig, { status: 'pending', completedAt: null, completedBy: null });
    } else if (act === 'move') {
      if (!dueAt) return res.status(400).json({ success: false, message: 'dueAt required for move' });
      const nd = new Date(dueAt);
      if (isNaN(nd.getTime())) return res.status(400).json({ success: false, message: 'Invalid dueAt' });
      const scope = req.body.scope || 'this';
      occ = await moveOccurrence(task, orig, nd, scope, req);
    } else {
      return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    // Завершение серии по count/until: если все вхождения закрыты и правило конечное
    await maybeCompleteSeries(task);

    res.json({ success: true, occurrence: occ });
  } catch (e) {
    console.error('occurrence action error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Перенос вхождения с учётом scope.
 * this — запись Occurrence с новым dueAt (originalDate не меняется).
 * following — разделение правила: старое until = день перед originalDate; новое правило с новой датой.
 * all — сдвиг всего правила (новый якорь = новая дата).
 */
async function moveOccurrence(task, orig, newDue, scope, req) {
  if (scope === 'this') {
    return upsertOccurrence(task, orig, { dueAt: newDue, status: 'pending', notificationsSent: { dayBefore: null, beforeDue: null, atDue: null, overdue: null } });
  }
  if (scope === 'all') {
    // сдвигаем якорь правила: новое time/день из newDue
    const rec = task.recurrence || {};
    const d = new Date(newDue);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    rec.time = `${hh}:${mm}`;
    if (rec.freq === 'monthly') rec.byMonthDay = d.getUTCDate();
    task.recurrence = rec;
    task.markModified('recurrence');
    await task.save();
    return null;
  }
  if (scope === 'following') {
    return splitSeries(task, orig, newDue);
  }
  // неизвестный scope — как this
  return upsertOccurrence(task, orig, { dueAt: newDue, status: 'pending' });
}

/**
 * Split серии (scope following): старая Task.until = перед orig; новая Task-продолжение с новым правилом.
 * Исключения (Occurrence) с originalDate >= orig переносятся к новой Task.
 * Если orig — самое первое вхождение, split не нужен (эквивалент all).
 */
async function splitSeries(task, orig, newDue) {
  const rec = { ...(task.recurrence || {}) };
  // самое первое вхождение? (нет закрытых/перенесённых до orig)
  const beforeCount = await Occurrence.countDocuments({
    taskId: task._id,
    originalDate: { $lt: orig },
    $or: [{ status: { $in: ['done', 'skipped', 'missed'] } }, { dueAt: { $ne: null } }],
  });
  if (beforeCount === 0) {
    // first вхождение — как all: меняем якорь
    const d = new Date(newDue);
    rec.time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    if (rec.freq === 'monthly') rec.byMonthDay = d.getUTCDate();
    task.recurrence = rec;
    task.markModified('recurrence');
    await task.save();
    return null;
  }

  const seriesId = task.seriesId || task._id;
  const oldUntil = new Date(orig.getTime() - 1);

  // 1) новая Task-продолжение
  const d = new Date(newDue);
  const newRec = { ...(task.recurrence || {}) };
  newRec.until = null;
  if (newRec.count) {
    // пересчёт count: исходное минус число уже прошедших вхождений
    const passed = await Occurrence.countDocuments({ taskId: task._id, originalDate: { $lt: orig } });
    newRec.count = Math.max(1, (rec.count || 0) - passed);
  }
  newRec.time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  if (newRec.freq === 'monthly') newRec.byMonthDay = d.getUTCDate();

  let newTask;
  try {
    newTask = await Task.create({
      title: task.title,
      description: task.description,
      statusId: task.statusId,
      priority: task.priority,
      order: task.order,
      dueDate: null,
      recurrence: newRec,
      notifications: task.notifications,
      workspaceId: task.workspaceId,
      userId: task.userId,
      createdBy: task.createdBy || task.userId,
      assigneeId: task.assigneeId || null,
      seriesId,
      prevTaskId: task._id,
    });
  } catch (e) {
    throw new Error('split failed at create: ' + e.message);
  }

  // 2) перенос исключений (Occurrence с originalDate >= orig) к новой Task (с защитой unique)
  const hasAction = (o) => o.status === 'done' || o.status === 'skipped' || o.status === 'missed' ||
    (o.notificationsSent && (o.notificationsSent.dayBefore || o.notificationsSent.beforeDue || o.notificationsSent.atDue || o.notificationsSent.overdue)) ||
    (o.dueAt && o.originalDate && o.dueAt.getTime() !== o.originalDate.getTime());
  const toMove = await Occurrence.find({ taskId: task._id, originalDate: { $gte: orig } }).lean();
  for (const o of toMove) {
    const exists = await Occurrence.findOne({ taskId: newTask._id, originalDate: o.originalDate }).lean();
    if (exists) {
      const a = hasAction(o), b = hasAction(exists);
      if (a && b) {
        // обе с действием — не теряем ничего, останавливаем операцию
        throw new Error('split conflict: обе записи с действием, отмена');
      }
      if (a && !b) {
        // старая с действием — оставляем её, чистый pending у новой удаляем
        await Occurrence.deleteOne({ _id: exists._id });
        await Occurrence.updateOne({ _id: o._id }, { $set: { taskId: newTask._id, workspaceId: newTask.workspaceId } });
      } else {
        // exists с действием — оставляем exists, чистый pending старой удаляем
        await Occurrence.deleteOne({ _id: o._id });
      }
      continue;
    }
    await Occurrence.updateOne({ _id: o._id }, { $set: { taskId: newTask._id, workspaceId: newTask.workspaceId } });
  }

  // 3) закрыть старую: until = перед orig, seriesId, причина split, финальный статус (не в активных)
  rec.until = oldUntil;
  task.recurrence = rec;
  task.seriesId = seriesId;
  task.closedReason = 'split';
  const Status = require('../models/Status');
  const finalStatus = await Status.findOne({ workspaceId: task.workspaceId, isFinal: true }).sort({ order: 1 });
  if (finalStatus) task.statusId = finalStatus._id;
  task.markModified('recurrence');
  try {
    await task.save();
  } catch (e) {
    // компенсация: вернуть перенесённые Occurrence и удалить новую Task
    await Occurrence.updateMany({ taskId: newTask._id, originalDate: { $gte: orig } }, { $set: { taskId: task._id } });
    await Task.deleteOne({ _id: newTask._id });
    throw new Error('split failed at close-old (compensated): ' + e.message);
  }

  // 4) перенесённое вхождение (само orig) — новая дата
  return upsertOccurrence(newTask, orig, { dueAt: newDue, status: 'pending', notificationsSent: { dayBefore: null, beforeDue: null, atDue: null, overdue: null } });
}

/** Если правило конечное (count/until) и все вхождения закрыты — завершить задачу. */
async function maybeCompleteSeries(task) {
  const rec = task.recurrence;
  if (!rec || !rec.freq) return;
  if (!rec.until && !rec.count) return; // бессрочная — вручную
  // все ли возможные вхождения закрыты?
  const { getNextOccurrences } = require('../utils/recurrence');
  const all = getNextOccurrences(rec, new Date(0), 1000);
  const origs = all.map((d) => d.getTime());
  const done = await Occurrence.find({ taskId: task._id, status: { $in: ['done', 'skipped'] }, originalDate: { $in: all } }).select('originalDate').lean();
  if (done.length >= origs.length && origs.length > 0) {
    // ставим финальный статус (первый финальный статус workspace)
    const Status = require('../models/Status');
    const finalStatus = await Status.findOne({ workspaceId: task.workspaceId, isFinal: true }).sort({ order: 1 });
    if (finalStatus) {
      task.statusId = finalStatus._id;
      await task.save();
    }
  }
}

/** POST /api/occurrences/complete-series { taskId } - ручное завершение бессрочной серии. */
const completeSeries = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'update')) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { taskId } = req.body;
    if (!isValidId(taskId)) return res.status(400).json({ success: false, message: 'Invalid taskId' });
    const task = await findTask(taskId, req.workspaceId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const Status = require('../models/Status');
    const finalStatus = await Status.findOne({ workspaceId: task.workspaceId, isFinal: true }).sort({ order: 1 });
    if (!finalStatus) return res.status(400).json({ success: false, message: 'No final status' });
    task.statusId = finalStatus._id;
    task.closedReason = 'manual';
    await task.save();
    res.json({ success: true, task });
  } catch (e) {
    console.error('complete series error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { action, completeSeries };
