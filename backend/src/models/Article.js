const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

articleSchema.index({ userId: 1, createdAt: -1 }); // список статей
articleSchema.index({ userId: 1, title: 1 }); // фильтр по title (префиксный)

module.exports = mongoose.model('Article', articleSchema);