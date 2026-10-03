const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const Workspace = require('../models/Workspace');

/**
 * Резолвит workspace-контекст запроса: req.workspaceId, req.membership.
 * Приоритет: заголовок X-Workspace-Id (валидируется по membership), иначе —
 * личный workspace пользователя (isPersonal). НИКОГДА не берём из body/query.
 *
 * Ставится после auth. Кэш — только в рамках одного запроса (req._membershipCache).
 */
module.exports = async function workspaceContext(req, res, next) {
  try {
    const headerWs = req.get('X-Workspace-Id');

    if (headerWs) {
      if (!mongoose.Types.ObjectId.isValid(headerWs)) {
        return res.status(400).json({ success: false, message: 'Invalid workspace id' });
      }
      const m = await Membership.findOne({ userId: req.user._id, workspaceId: headerWs }).lean();
      if (!m) return res.status(404).json({ success: false, message: 'Workspace not found' });
      req.workspaceId = m.workspaceId;
      req.membership = m;
      return next();
    }

    // Личный workspace по умолчанию: membership(owner) + workspace.isPersonal
    const personal = await Workspace.findOne({ createdBy: req.user._id, isPersonal: true }).select('_id').lean();
    if (!personal) {
      return res.status(500).json({ success: false, message: 'Workspace not initialized' });
    }
    const m = await Membership.findOne({ userId: req.user._id, workspaceId: personal._id }).lean();
    if (!m) return res.status(404).json({ success: false, message: 'Workspace not found' });
    req.workspaceId = m.workspaceId;
    req.membership = m;
    next();
  } catch (e) {
    console.error('workspaceContext error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
