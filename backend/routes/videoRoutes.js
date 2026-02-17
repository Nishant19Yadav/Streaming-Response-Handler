const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const { authenticate, authorize } = require('../utils/auth');

// Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for demo
});

// Routes
router.post('/upload', authenticate, authorize('admin'), upload.single('video'), videoController.uploadVideo);
router.get('/', videoController.getVideos);
router.get('/stream/:id', videoController.streamVideo);
router.delete('/:id', authenticate, authorize('admin'), videoController.deleteVideo);

module.exports = router;
