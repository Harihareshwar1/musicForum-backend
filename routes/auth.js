const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const config = require('../config');

router.post('/register', [
    check('username', 'Username is required').notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({
                message: 'User already exists with this email or username'
            });
        }

        // Create new user
        user = new User({
            username,
            email,
            password
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Error in /api/auth/register:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.array());
            
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Error in /api/auth/login:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error('Error in /api/auth/user:', err);
        res.status(500).json({ message: 'Server error fetching user data' });
    }
});

// Google OAuth login endpoint
router.post('/google-login', async (req, res) => {
    try {
        const { email, name, googleId, picture } = req.body;

        // Find or create user
        let user = await User.findOne({ email });
        
        if (!user) {
            // Create new user
            const username = name;
            user = new User({
                username,
                email,
                googleId,
                isGoogleUser: true,
                avatar: picture
            });
            await user.save();
        } else {
            // Update existing user's Google ID and avatar if needed
            if (!user.googleId) {
                user.googleId = googleId;
                user.isGoogleUser = true;
            }
            if (picture && user.avatar !== picture) {
                user.avatar = picture;
            }
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id,
                name: user.username,
                email: user.email,
                avatar: user.avatar
            },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.username,
                email: user.email,
                picture: user.avatar
            }
        });
    } catch (error) {
        console.error('Error in Google login:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
