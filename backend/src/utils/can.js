const Membership = require('../models/Membership');

/**
 * Права ролей как данные: роль -> набор действий.
 * Не хардкодим if (role==='owner') по коду.
 */
const ROLE_ACTIONS = {
  owner:  ['read', 'create', 'update', 'delete', 'assign', 'manage'],
  admin:  ['read', 'create', 'update', 'delete', 'assign'],
  member: ['read', 'create', 'update'],
  viewer: ['read'],
};

/** Есть ли у роли право на действие. */
function roleCan(role, action) {
  const actions = ROLE_ACTIONS[role];
  return Array.isArray(actions) && actions.includes(action);
}

/**
 * Проверка доступа: может ли пользователь совершить action над сущностью workspace.
 * @param {ObjectId} userId
 * @param {string} action read|create|update|delete|assign|manage
 * @param {Object} entity — сущность с полем workspaceId
 * @returns {Promise<{ok:boolean, role?:string}>}
 */
async function can(userId, action, entity) {
  if (!entity || !entity.workspaceId) return { ok: false };
  const m = await Membership.findOne({ userId, workspaceId: entity.workspaceId }).select('role').lean();
  if (!m) return { ok: false };
  return { ok: roleCan(m.role, action), role: m.role };
}

/** Может ли пользователь войти в workspace (членство есть). */
async function isMember(userId, workspaceId) {
  if (!workspaceId) return false;
  const m = await Membership.findOne({ userId, workspaceId }).select('_id').lean();
  return !!m;
}

/**
 * Проверка по уже полученному membership (без запроса в БД).
 * @param {object} membership — req.membership (с role)
 * @param {string} action
 */
function canByMembership(membership, action) {
  if (!membership || !membership.role) return false;
  return roleCan(membership.role, action);
}

module.exports = { can, canByMembership, isMember, roleCan, ROLE_ACTIONS };
