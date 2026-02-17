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
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Routes
router.post('/upload', authenticate, authorize('admin'), upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), videoController.uploadVideo);

router.get('/', videoController.getVideos);
router.get('/search', videoController.searchVideos);
router.get('/stream/:id', videoController.streamVideo);
router.get('/stats', authenticate, authorize('admin'), videoController.getAdminStats);
router.put('/:id', authenticate, authorize('admin'), videoController.updateVideo);
router.delete('/:id', authenticate, authorize('admin'), videoController.deleteVideo);

module.exports = router;

