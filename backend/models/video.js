const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    thumbnail: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    duration: { type: String },
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);

