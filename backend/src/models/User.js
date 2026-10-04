const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  // IANA-зона пользователя (напр. Europe/Moscow). Из неё считаются 'сегодня', границы дня, recurrence.tz.
  timezone: {
    type: String,
    default: null
  },
  dashboardSettings: {
    upcomingDays: { type: Number, default: 3, min: 1, max: 30 },
    blocks: {
      type: [{
        id: { type: String, required: true },
        visible: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        config: { type: mongoose.Schema.Types.Mixed, default: {} }
      }],
      default: undefined
    }
  },
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    beforeDue: { type: Boolean, default: true },
    atDue: { type: Boolean, default: true },
    overdueReminder: { type: Boolean, default: false },
    dailyDigest: { type: Boolean, default: true },
    dailyDigestTime: { type: String, default: '09:00' },
    quietHours: {
      enabled: { type: Boolean, default: true },
      from: { type: String, default: '22:00' },
      to: { type: String, default: '08:00' }
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);