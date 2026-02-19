const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /api/quizzes - list all published quizzes
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search, page = 1, limit = 12 } = req.query;
    const filter = { isPublished: true };

    if (category && category !== 'All') filter.category = category;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const total = await Quiz.countDocuments(filter);
    const quizzes = await Quiz.find(filter)
      .populate('creator', 'username')
      .select('-questions.options.isCorrect -attempts')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ quizzes, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// GET /api/quizzes/my - get current user's quizzes
router.get('/my', requireAuth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.userId })
      .select('-questions.options.isCorrect')
      .sort({ createdAt: -1 });
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your quizzes' });
  }
});

// GET /api/quizzes/:id - get a single quiz (without correct answers)
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('creator', 'username')
      .select('-questions.options.isCorrect -attempts');
    
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
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
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({ 
          error: `Question ${i + 1} must have exactly one correct answer` 
        });
      }
    }

    const quiz = await Quiz.create({
      title, description, category, difficulty, questions,
      timeLimitMinutes: timeLimitMinutes || 0,
      tags: tags || [],
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

// PUT /api/quizzes/:id - update a quiz
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    const { title, description, category, difficulty, questions, timeLimitMinutes, tags, isPublished } = req.body;
    Object.assign(quiz, { title, description, category, difficulty, questions, timeLimitMinutes, tags, isPublished });
    await quiz.save();

    res.json({ message: 'Quiz updated successfully', quiz });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quiz' });
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
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// POST /api/quizzes/:id/submit - submit quiz answers
router.post('/:id/submit', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { answers } = req.body; // array of { questionIndex, selectedOption }
    
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

    // Save attempt
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

    // Update user record if logged in
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: { quizzesTaken: { quiz: quiz._id, score, total } }
      });
    }

    res.json({ score, total, percentage, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

module.exports = router;