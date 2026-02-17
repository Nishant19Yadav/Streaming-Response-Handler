const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');

const { authenticate } = require('../utils/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);
router.get('/profile', authenticate, authController.getProfile);
router.post('/history', authenticate, authController.updateHistory);
router.post('/like', authenticate, authController.toggleLike);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        // Successful authentication, redirect with token
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email, role: req.user.role, name: req.user.name },
            process.env.JWT_SECRET || 'pro-stream-ultra-secret-key-2026',
            { expiresIn: '7d' }
        );
        res.redirect(`/auth-success?token=${token}`);
    }
);

module.exports = router;
