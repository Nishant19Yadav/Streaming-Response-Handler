// require('dotenv').config();
// const mongoose = require('mongoose');

// const MONGO_URI = process.env.MONGO_URI;

// console.log('Testing connection to:', MONGO_URI.split('@')[1]); // Log part of it for safety

// mongoose.connect(MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     serverSelectionTimeoutMS: 5000
// }).then(() => {
//     console.log('Success: Connected to MongoDB');
//     process.exit(0);
// }).catch(err => {
//     console.error('Error: Could not connect to MongoDB:', err.message);
//     process.exit(1);
// });
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Check if URI exists
if (!MONGO_URI) {
    console.error('Error: MONGO_URI is not defined in .env file');
    process.exit(1);
}

// Log partial URI safely
console.log('Testing connection to:', MONGO_URI.split('@')[1]);

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log('Success: Connected to MongoDB');
    process.exit(0);
}).catch(err => {
    console.error('Error: Could not connect to MongoDB');
    console.error('Reason:', err.message);
    process.exit(1);
});
