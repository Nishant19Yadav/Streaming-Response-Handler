const { MongoClient } = require('mongodb');

// Connection URL
const url = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function main() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log('Connected successfully to MongoDB server');
        const db = client.db('streaming_db');
        const collection = db.collection('test_connection');
        await collection.insertOne({ status: 'ok', timestamp: new Date() });
        console.log('Inserted connection check document');
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main();
