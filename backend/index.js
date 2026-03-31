require('dotenv').config();
const express = require('express');

const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');

require('./utils/passport'); // Load passport config

const videoRoutes = require('./routes/videoRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pro_streaming_db';

// Ensure upload directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'pro-stream-secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/firebase-config.js', (req, res) => {
    const config = {
        apiKey: process.env.VITE_FIREBASE_KEY,
        authDomain: "prostream-app.firebaseapp.com",
        projectId: "prostream-app",
        storageBucket: "prostream-app.firebasestorage.app",
        messagingSenderId: "954690644960",
        appId: "1:954690644960:web:3d697bcc4fd94b592c1985",
        measurementId: "G-PXFSJH4BGR"
    };
    res.type('application/javascript');
    res.send(`window.firebaseConfig = ${JSON.stringify(config)};`);
});

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

// Database Connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log('✅ Successfully connected to MongoDB ATLAS');
    app.listen(PORT, () => {
        console.log(`🚀 Streaming Platform running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ FAILED to connect to MongoDB ATLAS');
    console.error('Error Detail:', err.message);
    console.error('--------------------------------------------------');
    console.error('ACTION REQUIRED:');
    console.error('1. Log into MongoDB Atlas Console.');
    console.error('2. Go to "Network Access".');
    console.error('3. Click "Add IP Address" and select "Allow Access from Anywhere".');
    console.error('4. Check if your password in .env is correct.');
    console.error('--------------------------------------------------');
    process.exit(1);
});




// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down...');
    mongoose.connection.close();
    process.exit(0);
});
