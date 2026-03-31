require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

console.log('Testing connection to:', MONGO_URI.split('@')[1]); // Log part of it for safety

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log('Success: Connected to MongoDB');
    process.exit(0);
}).catch(err => {
    console.error('Error: Could not connect to MongoDB:', err.message);
    process.exit(1);
});
