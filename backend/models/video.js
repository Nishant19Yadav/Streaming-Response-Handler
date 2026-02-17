const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    duration: { type: Number, default: 0 },
    uploadDate: { type: Date, default: Date.now },
    description: { type: String },
    thumbnail: { type: String }
});

module.exports = mongoose.model('Video', videoSchema);
