const Task = require('../models/Task');
const Status = require('../models/Status');
const Occurrence = require('../models/Occurrence');
const { getNextOccurrences } = require('../utils/recurrence');
const escapeRegex = require('../utils/escapeRegex');
const { SINGLE, RECURRING } = require('../utils/taskKinds');
const { summarizeOccurrences, enrichTaskDue } = require('../utils/taskDueSummary');

const OCCURRENCE_HORIZON_DAYS = 7;

const generateOccurrencesForTask = async (task) => {
  if (!task.recurrence || !task.recurrence.type) return;
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
    let { statusId } = req.body;

    if (!statusId) {
      const firstStatus = await Status.findOne({ userId: req.user._id })
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
      userId: req.user._id,
      statusId
    }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const { title, description, priority, dueDate, recurrence, notifications } = req.body;
    const task = new Task({
      title, description, priority, dueDate, recurrence, notifications,
      statusId,
      order,
      userId: req.user._id
    });

    await task.save();
    await generateOccurrencesForTask(task);

    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTasks = async (req, res) => {
  try {
    const {
      q, priority, statusId, statusIds,
      dateFrom, dateTo, sort, overdue, dueSoon, taskType
    } = req.query;

    const filter = { userId: req.user._id };

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
      const statuses = await Status.find({ userId: req.user._id });
      const activeStatusIds = statuses.filter((s) => !s.isFinal).map((s) => s._id);

      const now = new Date();
      const upcomingLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const dateCondition = wantsOverdue
        ? { $lt: now }
        : { $gte: now, $lte: upcomingLimit };

      // --- 1) Разовые задачи ---
      const simpleTasks = await Task.find({
        userId: req.user._id,
        statusId: { $in: activeStatusIds },
        dueDate: { $ne: null, ...dateCondition },
        ...SINGLE
      }).select('_id');

      const simpleTaskIds = simpleTasks.map((t) => String(t._id));

      // --- 2) Повторяющиеся задачи через Occurrence ---
      const occurrenceMatch = {
        userId: req.user._id,
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
        userId: req.user._id,
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

    // Сроковая сводка по задаче — единая функция (R1).
    const recurringIds = tasks
      .filter((t) => t.recurrence && t.recurrence.type)
      .map((t) => t._id);
    const summary = await summarizeOccurrences(req.user._id, recurringIds);
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
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

    const recurrenceChanged = JSON.stringify(oldTask.recurrence || null) !==
      JSON.stringify(req.body.recurrence !== undefined ? req.body.recurrence : oldTask.recurrence);

    const newDue = req.body.dueDate;
    const dueChanged = newDue !== undefined &&
      (oldTask.dueDate ? new Date(oldTask.dueDate).toISOString() : null) !==
      (newDue ? new Date(newDue).toISOString() : null);

    // F1b: запрет смены дедлайна у повторяющейся задачи (DnD только разовых).
    // Если повторение убирают в этом же запросе — смена dueDate допустима.
    const wasRecurring = !!(oldTask.recurrence && oldTask.recurrence.type);
    const staysRecurring = req.body.recurrence !== undefined
      ? !!(req.body.recurrence && req.body.recurrence.type)
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
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (recurrenceChanged) {
      await Occurrence.deleteMany({ taskId: task._id, status: 'pending' });
      await generateOccurrencesForTask(task);
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
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
        { _id: item.id, userId: req.user._id },
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
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks
};