const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Default guest user ID for non-auth mode
const GUEST_USER_ID = '000000000000000000000001';

/**
 * Helper: Generate text using Groq
 */
const generateText = async (prompt) => {
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.7,
    max_tokens: 4096,
  });
  return chatCompletion.choices[0]?.message?.content || '';
};

/**
 * Helper: Strip markdown code fences from AI response
 */
const stripCodeFences = (text) => {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  return cleaned.trim();
};

// @route   POST /api/ai/explain
// @desc    Explain a topic at a given difficulty level
// @access  Public
router.post('/explain', async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const validDifficulties = ['simple', 'intermediate', 'advanced'];
    const level = validDifficulties.includes(difficulty) ? difficulty : 'simple';

    const prompt = `Explain the topic '${topic}' in ${level} terms. Make it clear, engaging, and easy to understand. Use examples and analogies where helpful. Format with markdown.`;

    const text = await generateText(prompt);

    res.json({ explanation: text });
  } catch (error) {
    console.error('Explain error:', error.message);
    res.status(500).json({ message: 'Failed to generate explanation. Please try again.' });
  }
});

// @route   POST /api/ai/summarize
// @desc    Summarize study notes
// @access  Public
router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const prompt = `Summarize the following study notes into concise, well-organized bullet points. Highlight key concepts and important details:\n\n${text}`;

    const summary = await generateText(prompt);

    // Save to Note model
    const note = await Note.create({
      userId: GUEST_USER_ID,
      originalText: text,
      summary,
    });

    res.json({ summary, noteId: note._id });
  } catch (error) {
    console.error('Summarize error:', error.message);
    res.status(500).json({ message: 'Failed to summarize notes. Please try again.' });
  }
});

// @route   POST /api/ai/generate-quiz
// @desc    Generate MCQ quiz using AI
// @access  Public
router.post('/generate-quiz', async (req, res) => {
  try {
    const { topic, numberOfQuestions, difficulty } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const numQuestions = Math.min(20, Math.max(5, parseInt(numberOfQuestions) || 5));

    const validDifficulties = ['simple', 'intermediate', 'advanced'];
    const level = validDifficulties.includes(difficulty) ? difficulty : 'intermediate';

    const prompt = `Generate ${numQuestions} multiple choice questions about '${topic}' at ${level} level. Return ONLY valid JSON array with objects having: question (string), options (array of 4 strings), correctAnswer (index 0-3), explanation (string). No markdown, no code fences, just the JSON array.`;

    const text = await generateText(prompt);

    const cleaned = stripCodeFences(text);
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Quiz JSON parse error:', parseError.message);
      return res.status(500).json({ message: 'Failed to parse quiz data from AI. Please try again.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ message: 'AI returned invalid quiz format. Please try again.' });
    }

    const quiz = await Quiz.create({
      userId: GUEST_USER_ID,
      topic,
      difficulty: level,
      questions,
      totalQuestions: questions.length,
    });

    res.json({
      quiz: {
        _id: quiz._id,
        topic: quiz.topic,
        questions: quiz.questions,
        difficulty: quiz.difficulty,
      },
    });
  } catch (error) {
    console.error('Generate quiz error:', error.message);
    res.status(500).json({ message: 'Failed to generate quiz. Please try again.' });
  }
});

// @route   POST /api/ai/generate-flashcards
// @desc    Generate concept-based flashcards using AI
// @access  Public
router.post('/generate-flashcards', async (req, res) => {
  try {
    const { topic, numberOfCards } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const numCards = Math.min(20, Math.max(5, parseInt(numberOfCards) || 10));

    const prompt = `Generate ${numCards} flashcards about key concepts of '${topic}'. Each flashcard should have a concept name on the front and a clear, concise explanation on the back. Return ONLY valid JSON array with objects having: front (concept name/key term), back (clear explanation of the concept). No markdown, no code fences, just the JSON array.`;

    const text = await generateText(prompt);

    const cleaned = stripCodeFences(text);
    let cards;
    try {
      cards = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Flashcard JSON parse error:', parseError.message);
      return res.status(500).json({ message: 'Failed to parse flashcard data from AI. Please try again.' });
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(500).json({ message: 'AI returned invalid flashcard format. Please try again.' });
    }

    const flashcardSet = await Flashcard.create({
      userId: GUEST_USER_ID,
      topic,
      cards,
    });

    res.json({
      flashcardSet: {
        _id: flashcardSet._id,
        topic: flashcardSet.topic,
        cards: flashcardSet.cards,
      },
    });
  } catch (error) {
    console.error('Generate flashcards error:', error.message);
    res.status(500).json({ message: 'Failed to generate flashcards. Please try again.' });
  }
});

// @route   POST /api/ai/quiz/:quizId/score
// @desc    Save quiz score
// @access  Public
router.post('/quiz/:quizId/score', async (req, res) => {
  try {
    const { score, totalQuestions } = req.body;
    const { quizId } = req.params;

    if (score === undefined || totalQuestions === undefined) {
      return res.status(400).json({ message: 'Score and totalQuestions are required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    quiz.score = score;
    quiz.totalQuestions = totalQuestions;
    await quiz.save();

    res.json(quiz);
  } catch (error) {
    console.error('Save score error:', error.message);
    res.status(500).json({ message: 'Failed to save quiz score' });
  }
});

module.exports = router;
