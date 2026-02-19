const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: {
    type: [optionSchema],
    validate: {
      validator: function(options) {
        return options.length >= 2 && options.length <= 6;
      },
      message: 'Each question must have between 2 and 6 options'
    }
  },
  explanation: { type: String, default: '' },
  points: { type: Number, default: 1 }
});

const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: Number,
  total: Number,
  percentage: Number,
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  completedAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['General', 'Science', 'History', 'Technology', 'Sports', 'Entertainment', 'Geography', 'Math', 'Language', 'Other'],
    default: 'General'
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: function(questions) {
        return questions.length >= 1;
      },
      message: 'Quiz must have at least 1 question'
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: { type: Boolean, default: true },
  timeLimitMinutes: { type: Number, default: 0 }, // 0 = no limit
  attempts: [attemptSchema],
  tags: [String],
  coverImage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

quizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

quizSchema.virtual('attemptCount').get(function() {
  return this.attempts.length;
});

quizSchema.virtual('averageScore').get(function() {
  if (this.attempts.length === 0) return 0;
  const sum = this.attempts.reduce((acc, a) => acc + a.percentage, 0);
  return Math.round(sum / this.attempts.length);
});

quizSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Quiz', quizSchema);
