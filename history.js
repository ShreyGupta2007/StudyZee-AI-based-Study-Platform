const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');

// Default guest user ID
const GUEST_USER_ID = '000000000000000000000001';

// @route   GET /api/history/notes
router.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find({ userId: GUEST_USER_ID }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error.message);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

// @route   GET /api/history/quizzes
router.get('/quizzes', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: GUEST_USER_ID }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error.message);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

// @route   GET /api/history/flashcards
router.get('/flashcards', async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ userId: GUEST_USER_ID }).sort({ createdAt: -1 });
    res.json(flashcards);
  } catch (error) {
    console.error('Get flashcards error:', error.message);
    res.status(500).json({ message: 'Failed to fetch flashcards' });
  }
});

// @route   DELETE /api/history/notes/:id
router.delete('/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error.message);
    res.status(500).json({ message: 'Failed to delete note' });
  }
});

// @route   DELETE /api/history/quizzes/:id
router.delete('/quizzes/:id', async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error.message);
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

// @route   DELETE /api/history/flashcards/:id
router.delete('/flashcards/:id', async (req, res) => {
  try {
    await Flashcard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Flashcard set deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard error:', error.message);
    res.status(500).json({ message: 'Failed to delete flashcard set' });
  }
});

module.exports = router;
