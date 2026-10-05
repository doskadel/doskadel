const Task = require('../models/Task');
const Status = require('../models/Status');
const Occurrence = require('../models/Occurrence');
const { getNextOccurrences } = require('../utils/recurrence');
const escapeRegex = require('../utils/escapeRegex');
const { SINGLE, RECURRING } = require('../utils/taskKinds');
const { canByMembership } = require('../utils/can');
const { summarizeOccurrences, enrichTaskDue } = require('../utils/taskDueSummary');
const { getActiveStatusIds } = require('../utils/dueItems');

const OCCURRENCE_HORIZON_DAYS = 7;

const generateOccurrencesForTask = async (task) => {
  if (!task.recurrence || !task.recurrence.freq) return;
  const now = new Date();
  const dates = getNextOccurrences(task.recurrence, now, OCCURRENCE_HORIZON_DAYS);
  if (dates.length === 0) return;

  const existing = await Occurrence.find({
    taskId: task._id,
    dueAt: { $in: dates }
  }).select('dueAt');
  const existingSet = new Set(existing.map((o) => o.dueAt.getTime()));
  const toCreate = dates.filter((d) => !existingSet.has(d.getTime()));

  if (toCreate.length > 0) {
    await Occurrence.insertMany(
      toCreate.map((d) => ({
        taskId: task._id,
        userId: task.userId,
        workspaceId: task.workspaceId,
        createdBy: task.createdBy || task.userId,
        originalDate: d,
        dueAt: d,
        status: 'pending',
        notificationsSent: {
          dayBefore: null,
          beforeDue: null,
          atDue: null,
          overdue: null
        }
      }))
    );
  }
};

const createTask = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'create')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    let { statusId } = req.body;

    if (!statusId) {
      const firstStatus = await Status.findOne({ workspaceId: req.workspaceId })
        .sort({ order: 1 });
      if (!firstStatus) {
        return res.status(400).json({
          success: false,
          message: 'У вас нет статусов. Создайте хотя бы один.'
        });
      }
      statusId = firstStatus._id;
    }

    const lastTask = await Task.findOne({
      workspaceId: req.workspaceId,
      statusId
    }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const { title, description, priority, dueDate, recurrence, notifications } = req.body;
    const task = new Task({
      title, description, priority, dueDate, recurrence, notifications,
      statusId,
      order,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      createdBy: req.user._id
    });

    await task.save();
    // F1c: вхождения считаются на лету, заранее не создаём

    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/calendar-marks?from=&to= — дни с хотя бы одной НЕвыполненной задачей (для маркеров календаря).
const getCalendarMarks = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to required' });
    const fromD = new Date(from);
    const toD = new Date(to);
    if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) return res.status(400).json({ success: false, message: 'Invalid dates' });

    const { resolveTz } = require('../utils/tz');
    const { DateTime } = require('luxon');
    const User = require('../models/User');
    const u = await User.findById(req.user._id).select('timezone').lean();
    const tz = resolveTz(u, req.get('X-Timezone'));
    const active = await getActiveStatusIds();
    const itemsByDay = {};
    const addItem = (date, item) => {
      const key = DateTime.fromJSDate(new Date(date), { zone: tz }).toISODate();
      if (!key) return;
      (itemsByDay[key] = itemsByDay[key] || []).push(item);
    };

    // разовые: dueDate, нефинал
    const singles = await Task.find({ ...SINGLE, workspaceId: req.workspaceId, statusId: { $in: active }, dueDate: { $gte: fromD, $lt: toD } }).select('_id title dueDate priority recurrence statusId').lean();
    singles.forEach((t) => addItem(t.dueDate, { taskId: String(t._id), title: t.title, dueAt: t.dueDate, priority: t.priority, isRecurring: false, originalDate: null }));

    // повторяющиеся: на лету (виртуальные вхождения)
    const { computeOccurrences } = require('../utils/dueItems');
    const occ = await computeOccurrences({ gte: fromD, lt: toD }, { workspaceId: req.workspaceId, activeStatusIds: active, floorDays: 0 });
    occ.forEach((o) => addItem(o.dueAt, { taskId: String(o.task._id), title: o.task.title, dueAt: o.dueAt, priority: o.task.priority, isRecurring: true, originalDate: o.originalDate }));

    res.json({ success: true, days: Object.keys(itemsByDay), itemsByDay });
  } catch (e) {
    console.error('calendar marks error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTasks = async (req, res) => {
  try {
    const {
      q, priority, statusId, statusIds,
      dateFrom, dateTo, sort, overdue, dueSoon, taskType
    } = req.query;

    const filter = { workspaceId: req.workspaceId };
    // closedReason != null (split/manual) — не активная, скрыта из списков/доски
    if (req.query.includeClosed !== 'true') filter.closedReason = null;

    if (q && q.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (priority) {
      const priorities = String(priority).split(',')
        .map((p) => parseInt(p, 10))
        .filter((p) => p >= 1 && p <= 3);
      if (priorities.length > 0) filter.priority = { $in: priorities };
    }

    if (statusIds) {
      const ids = String(statusIds).split(',').filter(Boolean);
      if (ids.length > 0) filter.statusId = { $in: ids };
    } else if (statusId) {
      filter.statusId = statusId;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    if (taskType === 'single') {
      Object.assign(filter, SINGLE);
    } else if (taskType === 'recurring') {
      Object.assign(filter, RECURRING);
    }

    const wantsOverdue = overdue === 'true';
    const wantsDueSoon = dueSoon === 'true';

    // Для overdue/dueSoon собираем taskIds из ДВУХ источников:
    // 1) разовые задачи (Task.dueDate)
    // 2) повторяющиеся задачи (Occurrence.dueAt, status=pending)
    let specialFilterTaskIds = null; // null = не применять ограничение
    let occurrenceDateByTaskId = new Map(); // taskId → Date (для повторяющихся)

    if (wantsOverdue || wantsDueSoon) {
      const statuses = await Status.find({ workspaceId: req.workspaceId });
      const activeStatusIds = statuses.filter((s) => !s.isFinal).map((s) => s._id);

      const now = new Date();
      const upcomingLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const dateCondition = wantsOverdue
        ? { $lt: now }
        : { $gte: now, $lte: upcomingLimit };

      // --- 1) Разовые задачи ---
      const simpleTasks = await Task.find({
        workspaceId: req.workspaceId,
        statusId: { $in: activeStatusIds },
        dueDate: { $ne: null, ...dateCondition },
        ...SINGLE
      }).select('_id');

      const simpleTaskIds = simpleTasks.map((t) => String(t._id));

      // --- 2) Повторяющиеся задачи через Occurrence ---
      const occurrenceMatch = {
        workspaceId: req.workspaceId,
        status: 'pending',
        dueAt: dateCondition
      };

      // Для overdue — самая свежая просрочка ($max)
      // Для dueSoon — самая ближайшая будущая ($min)
      const groupAccumulator = wantsOverdue
        ? { dateAt: { $max: '$dueAt' } }
        : { dateAt: { $min: '$dueAt' } };

      const occAgg = await Occurrence.aggregate([
        { $match: occurrenceMatch },
        {
          $group: {
            _id: '$taskId',
            ...groupAccumulator
          }
        }
      ]);

      // Фильтруем: оставляем только те taskId, которые принадлежат
      // активным повторяющимся задачам
      const recurringTaskIds = occAgg.map((o) => o._id);

      const recurringTasks = await Task.find({
        _id: { $in: recurringTaskIds },
        workspaceId: req.workspaceId,
        statusId: { $in: activeStatusIds },
        ...RECURRING
      }).select('_id');

      const recurringTaskIdSet = new Set(recurringTasks.map((t) => String(t._id)));

      // Собираем карту taskId → дата
      occAgg.forEach((o) => {
        const id = String(o._id);
        if (recurringTaskIdSet.has(id)) {
          occurrenceDateByTaskId.set(id, o.dateAt);
        }
      });

      // Объединяем taskIds
      specialFilterTaskIds = [
        ...simpleTaskIds,
        ...Array.from(recurringTaskIdSet)
      ];

      // Если ничего не нашли — сразу пустой результат
      if (specialFilterTaskIds.length === 0) {
        return res.json({ success: true, tasks: [] });
      }

      // Применяем фильтр по объединённому списку
      filter._id = { $in: specialFilterTaskIds };

      // statusId уже отфильтрован выше (activeStatusIds)
      filter.statusId = { $in: activeStatusIds };
    }

    let sortObj = { createdAt: -1 };
    if (wantsOverdue || wantsDueSoon) {
      // Сортируем отдельно на фронте/ниже, т.к. dueDate может быть null
      sortObj = { createdAt: -1 };
    } else {
      switch (sort) {
        case 'createdAt_asc': sortObj = { createdAt: 1 }; break;
        case 'priority_desc': sortObj = { priority: -1, createdAt: -1 }; break;
        case 'priority_asc': sortObj = { priority: 1, createdAt: -1 }; break;
        case 'title_asc': sortObj = { title: 1 }; break;
        case 'title_desc': sortObj = { title: -1 }; break;
        default: sortObj = { createdAt: -1 }; break;
      }
    }

    const isTitleSort = sort === 'title_asc' || sort === 'title_desc';
    const query = Task.find(filter).sort(sortObj);
    if (isTitleSort && !wantsOverdue && !wantsDueSoon) {
      query.collation({ locale: 'ru', strength: 2 });
    }

    let tasks = await query;

    // Сроковая сводка по задаче — на лету (F1c этап 2).
    const recurringTasks = tasks.filter((t) => t.recurrence && t.recurrence.freq).map((t) => t.toObject());
    const summary = await summarizeOccurrences(req.workspaceId, recurringTasks);
    tasks = tasks.map((t) => enrichTaskDue(t.toObject(), summary));

    // Для overdue/dueSoon — сортируем по дате (самое срочное сверху)
    if (wantsOverdue || wantsDueSoon) {
      tasks.sort((a, b) => {
        const aDate = a.nextOccurrenceDueAt ? new Date(a.nextOccurrenceDueAt).getTime() : 0;
        const bDate = b.nextOccurrenceDueAt ? new Date(b.nextOccurrenceDueAt).getTime() : 0;
        if (wantsOverdue) {
          // Просрочено: самая свежая сверху
          return bDate - aDate;
        }
        // Ближайшие: самая близкая сверху
        return aDate - bDate;
      });
    }

    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    // F1c: обогащаем сроковой сводкой (nextOccurrenceDueAt, pendingOccurrenceCount, occurrenceStatus)
    const obj = task.toObject();
    if (obj.recurrence && obj.recurrence.freq) {
      const summary = await summarizeOccurrences(req.workspaceId, [obj]);
      enrichTaskDue(obj, summary);
    } else {
      enrichTaskDue(obj, new Map());
    }
    res.json({ success: true, task: obj });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!canByMembership(req.membership, 'update')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const recurrenceChanged = JSON.stringify(oldTask.recurrence || null) !==
      JSON.stringify(req.body.recurrence !== undefined ? req.body.recurrence : oldTask.recurrence);

    const newDue = req.body.dueDate;
    const dueChanged = newDue !== undefined &&
      (oldTask.dueDate ? new Date(oldTask.dueDate).toISOString() : null) !==
      (newDue ? new Date(newDue).toISOString() : null);

    // F1b: запрет смены дедлайна у повторяющейся задачи (DnD только разовых).
    // Если повторение убирают в этом же запросе — смена dueDate допустима.
    const wasRecurring = !!(oldTask.recurrence && oldTask.recurrence.freq);
    const staysRecurring = req.body.recurrence !== undefined
      ? !!(req.body.recurrence && req.body.recurrence.freq)
      : wasRecurring;
    if (dueChanged && wasRecurring && staysRecurring) {
      return res.status(400).json({ success: false, message: 'Нельзя менять дедлайн повторяющейся задачи' });
    }

    const allowed = ['title', 'description', 'statusId', 'priority', 'order', 'dueDate', 'recurrence', 'notifications'];
    const updateData = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });
    if (dueChanged) {
      updateData.notificationsSent = {
        dayBefore: null,
        beforeDue: null,
        atDue: null,
        overdue: null
      };
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      updateData,
      { new: true, runValidators: true }
    );

    // F1c: при смене правила вхождения считаются на лету.
    // Удаляем только будущие чистые pending (без действий/отправок), факт (done/skipped/moved) сохраняем.
    if (recurrenceChanged) {
      await Occurrence.deleteMany({
        taskId: task._id,
        status: 'pending',
        dueAt: { $gte: new Date() },
        'notificationsSent.dayBefore': null,
        'notificationsSent.beforeDue': null,
        'notificationsSent.atDue': null,
        'notificationsSent.overdue': null,
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    if (!canByMembership(req.membership, 'delete')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await Occurrence.deleteMany({ taskId: task._id });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reorderTasks = async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, message: 'Tasks must be an array' });
    }
    for (const item of tasks) {
      await Task.updateOne(
        { _id: item.id, workspaceId: req.workspaceId },
        { statusId: item.statusId, order: item.order }
      );
    }
    res.json({ success: true, message: 'Tasks reordered' });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getCalendarMarks,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks
};