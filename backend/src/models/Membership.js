const mongoose = require('mongoose');

/**
 * Членство пользователя в workspace с ролью.
 * Роли: owner | admin | member | viewer. Сейчас используем owner/member.
 * Роль хранится как данные (не хардкод в коде).
 */
const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    required: true,
    default: 'member'
  }
}, {
  timestamps: true
});

// Один пользователь — одна запись членства в workspace
membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);
