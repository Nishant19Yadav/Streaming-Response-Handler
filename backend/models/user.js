const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true }, // Added to compatibility with existing index
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for Google OAuth users
    googleId: { type: String },
    loginType: { type: String, enum: ['email', 'google'], default: 'email' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    likedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    watchHistory: [{
        video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
        watchedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});


// Hash password before saving if it exists
userSchema.pre('save', async function (next) {
    if (!this.password || !this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

