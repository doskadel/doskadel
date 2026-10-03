const mongoose = require('mongoose');

/**
 * Пространство (workspace). Личный режим = workspace из одного человека (owner).
 * Групповой/корпоративный добавляет memberships без смены схемы.
 */
const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // true — личное пространство пользователя (создаётся при регистрации)
  isPersonal: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workspace', workspaceSchema);
