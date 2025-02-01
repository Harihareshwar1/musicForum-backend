const express = require('express');
const router = express.Router();
const Music = require('../models/Music');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/music
// @desc    Get all music with filters
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { language, search, sort = 'createdAt' } = req.query;
        let query = {};

        // Apply language filter
        if (language && language !== 'all') {
            query.language = language;
        }

        // Apply search filter
        if (search) {
            query.$text = { $search: search };
        }

        // Get music with sorting
        const music = await Music.find(query)
            .sort({ [sort]: -1 })
            .populate('addedBy', 'username')
            .lean();

        res.json(music);
    } catch (err) {
        console.error('Error in GET /api/music:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/music
// @desc    Add new music
// @access  Private (Admin)
router.post('/', [auth, [
    check('title', 'Title is required').notEmpty(),
    check('artist', 'Artist is required').notEmpty(),
    check('language', 'Language is required').notEmpty(),
    check('image', 'Image URL is required').notEmpty(),
    check('audioUrl', 'Audio URL is required').notEmpty()
]], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, artist, language, image, audioUrl } = req.body;

        // Check if music already exists
        const existingMusic = await Music.findOne({ title, artist });
        if (existingMusic) {
            return res.status(400).json({ message: 'This song already exists' });
        }

        const newMusic = new Music({
            title,
            artist,
            language,
            image,
            audioUrl,
            addedBy: req.user.id
        });

        const music = await newMusic.save();
        res.json(music);
    } catch (err) {
        console.error('Error in POST /api/music:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/music/:id/like
// @desc    Like/Unlike a song
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
    try {
        const music = await Music.findById(req.params.id);
        if (!music) {
            return res.status(404).json({ message: 'Music not found' });
        }

        // Check if already liked
        const likeIndex = music.likes.indexOf(req.user.id);
        if (likeIndex > -1) {
            // Unlike
            music.likes.splice(likeIndex, 1);
        } else {
            // Like
            music.likes.push(req.user.id);
        }

        await music.save();
        res.json(music.likes);
    } catch (err) {
        console.error('Error in POST /api/music/:id/like:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/music/:id/play
// @desc    Increment play count
// @access  Public
router.post('/:id/play', async (req, res) => {
    try {
        const music = await Music.findByIdAndUpdate(
            req.params.id,
            { $inc: { plays: 1 } },
            { new: true }
        );

        if (!music) {
            return res.status(404).json({ message: 'Music not found' });
        }

        res.json(music.plays);
    } catch (err) {
        console.error('Error in POST /api/music/:id/play:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/music/trending
// @desc    Get trending music (most played)
// @access  Public
router.get('/trending', async (req, res) => {
    try {
        const music = await Music.find()
            .sort({ plays: -1 })
            .limit(10)
            .populate('addedBy', 'username')
            .lean();

        res.json(music);
    } catch (err) {
        console.error('Error in GET /api/music/trending:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/music/language/:lang
// @desc    Get music by language
// @access  Public
router.get('/language/:lang', async (req, res) => {
    try {
        const music = await Music.find({ language: req.params.lang })
            .sort({ createdAt: -1 })
            .populate('addedBy', 'username')
            .lean();

        res.json(music);
    } catch (err) {
        console.error('Error in GET /api/music/language/:lang:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
