const Video = require('../models/video');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const AdaptiveBuffer = require('../streams/adaptive-buffer');
const CompressionPipeline = require('../streams/compression');

exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const video = new Video({
            title: req.body.title || req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            description: req.body.description
        });

        await video.save();
        res.status(201).json({ message: 'Video uploaded successfully', video });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
};

exports.getVideos = async (req, res) => {
    try {
        // Demonstrate MongoDB Cursor Streaming for the video list too 
        // Although usually only needed for massive datasets
        const cursor = Video.find().cursor();
        const videos = [];

        await cursor.eachAsync(video => {
            videos.push(video);
        });

        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
};

exports.streamVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ error: 'Video not found' });

        const videoPath = path.resolve(video.path);
        if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'File missing on server' });

        const range = req.headers.range;
        const fileSize = video.size;

        if (range) {
            // Range request for video seeking
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

            // Use adaptive buffer and handle backpressure
            const adaptiveBuffer = new AdaptiveBuffer();

            pipeline(file, adaptiveBuffer, res, (err) => {
                if (err) console.error('[Stream Error]', err.message);
            });

        } else {
            // Full stream with potential compression
            const compress = req.query.compress === 'true';
            const head = {
                'Content-Length': fileSize,
                'Content-Type': video.mimetype,
            };

            if (compress) {
                res.setHeader('Content-Encoding', 'gzip');
                const file = fs.createReadStream(videoPath);
                const adaptiveBuffer = new AdaptiveBuffer();
                const gzip = CompressionPipeline.createNativeGzip(); // Safer default for Windows

                await pipelineAsync(file, adaptiveBuffer, gzip, res);
            } else {
                res.writeHead(200, head);
                const file = fs.createReadStream(videoPath);
                const adaptiveBuffer = new AdaptiveBuffer();
                await pipelineAsync(file, adaptiveBuffer, res);
            }
        }
    } catch (error) {
        console.error('Streaming error:', error);
        if (!res.headersSent) res.status(500).send('Streaming error');
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (video && fs.existsSync(video.path)) {
            fs.unlinkSync(video.path);
        }
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
};
