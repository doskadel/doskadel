const User = require('../models/User');

// GET /api/users/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/notification-settings
const updateNotificationSettings = async (req, res) => {
  try {
    const allowed = ['enabled', 'beforeDue', 'atDue', 'overdueReminder', 'dailyDigest', 'dailyDigestTime', 'quietHours'];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[`notificationSettings.${key}`] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/avatar
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (typeof avatar !== 'string') {
      return res.status(400).json({ success: false, message: 'avatar must be a string' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMe,
  updateNotificationSettings,
  updateAvatar
};