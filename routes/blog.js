const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');

// @route   GET api/blog
// @desc    Get all blog posts
// @access  Public
router.get('/', async (req, res) => {
    try {
        const posts = await BlogPost.find()
            .populate('author', 'username name')
            .populate('comments.user', 'username name')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/blog
// @desc    Create a blog post
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, image = '', tags = [] } = req.body;
        
        // Create excerpt from content
        const excerpt = content.substring(0, 150) + '...';
        
        const newPost = new BlogPost({
            title,
            content,
            excerpt,
            author: req.user.id,
            image,
            tags,
            createdAt: new Date()
        });
        
        await newPost.save();
        
        const populatedPost = await BlogPost.findById(newPost._id)
            .populate('author', 'username name');
        
        res.json(populatedPost);
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE api/blog/:id
// @desc    Delete a blog post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log('Attempting to delete blog post:', req.params.id);
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user is authorized to delete the post
        if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to delete this post' });
        }

        await post.remove();
        console.log('Blog post deleted successfully:', req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Error in DELETE /api/blog/:id:', err);
        res.status(500).json({ 
            message: 'Error deleting blog post',
            error: err.message 
        });
    }
});

// @route   GET api/blog/:id
// @desc    Get blog post by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id)
            .populate('author', 'username name')
            .populate('comments.user', 'username name');
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        res.json(post);
    } catch (err) {
        console.error('Error fetching post:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's posts
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const posts = await BlogPost.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username name email')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username name email'
                }
            });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//likes
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if post has already been liked by this user
        const likeIndex = post.likes.indexOf(req.user.id);
        if (likeIndex > -1) {
            // Unlike
            post.likes.splice(likeIndex, 1);
        } else {
            // Like
            post.likes.push(req.user.id);
        }

        await post.save();
        
        const populatedPost = await BlogPost.findById(post._id)
            .populate('author', 'username name')
            .populate('comments.user', 'username name');
        
        res.json(populatedPost);
    } catch (err) {
        console.error('Error liking post:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST api/blog/:id/comment
// @desc    Add comment to blog post
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const { comment } = req.body;
        post.comments.unshift({
            text: comment,
            user: req.user.id,
            date: new Date()  // Using 'date' as per schema
        });

        await post.save();

        const updatedPost = await BlogPost.findById(post._id)
            .populate('author', 'username name')
            .populate('comments.user', 'username name');

        res.json(updatedPost);
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
