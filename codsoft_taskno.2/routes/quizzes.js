const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /api/quizzes - list all quizzes
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 50 } = req.query;

    // Don't filter by isPublished - show all quizzes
    const filter = {};

    if (category && category !== 'All') filter.category = category;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const total = await Quiz.countDocuments(filter);

    // Fetch full quiz then strip sensitive fields manually
    const quizzes = await Quiz.find(filter)
      .populate('creator', 'username')
      .select('-attempts')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(); // plain JS objects so we can mutate

    // Strip isCorrect from options before sending
    quizzes.forEach(quiz => {
      if (quiz.questions) {
        quiz.questions.forEach(q => {
          if (q.options) {
            q.options.forEach(opt => { delete opt.isCorrect; });
          }
        });
      }
    });

    res.json({ quizzes, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('GET quizzes error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch quizzes' });
  }
});

// GET /api/quizzes/my - get current user's quizzes
router.get('/my', requireAuth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.userId })
      .select('-attempts')
      .sort({ createdAt: -1 })
      .lean();

    quizzes.forEach(quiz => {
      if (quiz.questions) {
        quiz.questions.forEach(q => {
          if (q.options) {
            q.options.forEach(opt => { delete opt.isCorrect; });
          }
        });
      }
    });

    res.json({ quizzes });
  } catch (err) {
    console.error('GET my quizzes error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch your quizzes' });
  }
});

// GET /api/quizzes/:id - single quiz without correct answers
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('creator', 'username')
      .select('-attempts')
      .lean();

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Strip isCorrect from options
    if (quiz.questions) {
      quiz.questions.forEach(q => {
        if (q.options) {
          q.options.forEach(opt => { delete opt.isCorrect; });
        }
      });
    }

    res.json({ quiz });
  } catch (err) {
    console.error('GET quiz error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch quiz' });
  }
});

// POST /api/quizzes - create a quiz
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, category, difficulty, questions, timeLimitMinutes, tags } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    // Validate each question has exactly one correct answer
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.options || q.options.length < 2) {
        return res.status(400).json({ error: `Question ${i + 1} must have at least 2 options` });
      }
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          error: `Question ${i + 1} must have exactly one correct answer (found ${correctCount})`
        });
      }
    }

    const quiz = await Quiz.create({
      title,
      description: description || '',
      category: category || 'General',
      difficulty: difficulty || 'Medium',
      questions,
      timeLimitMinutes: timeLimitMinutes || 0,
      tags: tags || [],
      isPublished: true,
      creator: req.userId
    });

    await User.findByIdAndUpdate(req.userId, {
      $push: { quizzesCreated: quiz._id }
    });

    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (err) {
    console.error('CREATE QUIZ ERROR:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    res.status(500).json({ error: err.message || 'Failed to create quiz' });
  }
});

// DELETE /api/quizzes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    await quiz.deleteOne();
    await User.findByIdAndUpdate(req.userId, {
      $pull: { quizzesCreated: quiz._id }
    });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete quiz' });
  }
});

// POST /api/quizzes/:id/submit - submit quiz answers
router.post('/:id/submit', async (req, res) => {
  try {
    // Fetch the FULL quiz (with isCorrect) for scoring
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    let score = 0;
    const results = quiz.questions.map((q, i) => {
      const userAnswer = answers.find(a => a.questionIndex === i);
      const selectedIdx = userAnswer ? userAnswer.selectedOption : -1;
      const correctIdx = q.options.findIndex(o => o.isCorrect);
      const isCorrect = selectedIdx === correctIdx;
      if (isCorrect) score += q.points || 1;

      return {
        questionIndex: i,
        questionText: q.text,
        selectedOption: selectedIdx,
        correctOption: correctIdx,
        isCorrect,
        explanation: q.explanation,
        options: q.options.map(o => o.text)
      };
    });

    const total = quiz.questions.reduce((acc, q) => acc + (q.points || 1), 0);
    const percentage = Math.round((score / total) * 100);

    const attempt = {
      user: req.userId || null,
      score,
      total,
      percentage,
      answers: answers.map(a => ({
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        isCorrect: results[a.questionIndex]?.isCorrect || false
      }))
    };

    quiz.attempts.push(attempt);
    await quiz.save();

    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: { quizzesTaken: { quiz: quiz._id, score, total } }
      });
    }

    res.json({ score, total, percentage, results });
  } catch (err) {
    console.error('SUBMIT QUIZ ERROR:', err);
    res.status(500).json({ error: err.message || 'Failed to submit quiz' });
  }
});

module.exports = router;