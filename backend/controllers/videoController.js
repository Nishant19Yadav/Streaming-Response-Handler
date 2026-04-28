const mongoose = require('mongoose');
const Video = require('../models/video');

const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const AdaptiveBuffer = require('../streams/adaptive-buffer');
const CompressionPipeline = require('../streams/compression');

exports.uploadVideo = async (req, res) => {
    try {
        // Check if video file is uploaded
        if (!req.files || !req.files.video) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        // Extract uploaded video file (first file from array)
        const videoFile = req.files.video[0];

        // Extract thumbnail if provided, else set null
        const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

        // Create new Video document
        const video = new Video({
            // Use title from request or fallback to original file name
            title: req.body.title || videoFile.originalname,

            // Store description from request
            description: req.body.description,

            // Internal streaming route for video playback
            videoUrl: `/api/videos/stream/${videoFile.filename}`,

            // Store actual filename for server access
            filename: videoFile.filename,

            // Thumbnail path (uploaded or default placeholder)
            thumbnail: thumbnailFile 
                ? `/uploads/${thumbnailFile.filename}` 
                : '/placeholder-thumb.jpg',

            // Store file type (e.g., video/mp4)
            mimetype: videoFile.mimetype,

            // Store file size
            size: videoFile.size,

            // Store duration (default if not provided)
            duration: req.body.duration || '0:00'
        });

        // Save video data to database
        await video.save();

        // Send success response
        res.status(201).json({ 
            message: 'Video uploaded successfully', 
            video 
        });

    } catch (error) {
        // Log error for debugging
        console.error('Upload error:', error);

        // Send failure response
        res.status(500).json({ error: 'Failed to upload video' });
    }
};

exports.getVideos = async (req, res) => {
    try {
        const videos = await Video.find().sort({ uploadDate: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
};

exports.searchVideos = async (req, res) => {
    try {
        const { q } = req.query;
        const videos = await Video.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ]
        });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
};

exports.streamVideo = async (req, res) => {
    try {
        // id can be MongoDB ID or filename
        const video = await Video.findOne({
            $or: [{ _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }, { filename: req.params.id }]
        });

        if (!video) return res.status(404).json({ error: 'Video not found' });

        const videoPath = path.join(__dirname, '../../uploads', video.filename);
        if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'File missing on server' });

        // Update views count
        video.views += 1;
        await video.save().catch(e => console.error('View count update error', e));

        const range = req.headers.range;
        const fileSize = video.size;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': video.mimetype,
            };

            res.writeHead(206, head);
            const adaptiveBuffer = new AdaptiveBuffer();
            pipeline(file, adaptiveBuffer, res, (err) => {
                if (err) console.error('[Stream Error]', err.message);
            });
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': video.mimetype,
            };
            res.writeHead(200, head);
            const file = fs.createReadStream(videoPath);
            const adaptiveBuffer = new AdaptiveBuffer();
            await pipelineAsync(file, adaptiveBuffer, res);
        }
    } catch (error) {
        console.error('Streaming error:', error);
        if (!res.headersSent) res.status(500).send('Streaming error');
    }
};

exports.getAdminStats = async (req, res) => {
    try {
        const totalVideos = await Video.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalViews = await Video.aggregate([
            { $group: { _id: null, total: { $sum: "$views" } } }
        ]);

        res.json({
            totalVideos,
            totalUsers,
            totalViews: totalViews[0] ? totalViews[0].total : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

exports.updateVideo = async (req, res) => {
    try {
        const { title, description } = req.body;
        const video = await Video.findByIdAndUpdate(req.params.id, { title, description }, { new: true });
        res.json(video);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ error: 'Video not found' });

        const videoPath = path.join(__dirname, '../../uploads', video.filename);
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }

        // Also delete thumbnail if it exists in uploads
        if (video.thumbnail && video.thumbnail.startsWith('/uploads/')) {
            const thumbPath = path.join(__dirname, '../../', video.thumbnail);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }

        await Video.findByIdAndDelete(req.params.id);
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
};

