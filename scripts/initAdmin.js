require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../backend/models/admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pro_streaming_db';

async function initAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const username = 'admin';
        const password = 'adminPassword123'; // Change this!

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            console.log('Admin already exists');
        } else {
            const admin = new Admin({ username, password });
            await admin.save();
            console.log(`Admin created: ${username} / ${password}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}

initAdmin();
