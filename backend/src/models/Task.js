const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 3,
    default: 2,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

taskSchema.index({ userId: 1, statusId: 1, order: 1 });

module.exports = mongoose.model('Task', taskSchema);