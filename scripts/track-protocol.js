// scripts/track-protocol.js - CLI tool for tracking protocol changes
const GitProtocolTracker = require('../lib/git-tracker');

const tracker = new GitProtocolTracker();

// Example: Track a new protocol version
const schema = {
    version: '2.0.0',
    batchSize: 2000,
    compression: 'zstd',
    buffering: 'adaptive',
    features: {
        backpressure: true,
        rateLimit: true,
        monitoring: true
    }
};

const result = tracker.trackProtocolChange('mongo-stream', schema, {
    description: 'Upgraded to zstd compression and increased batch size',
    action: 'updated'
});

console.log('Protocol tracked:', result);

// Display current version
const currentVersion = tracker.getCurrentVersion('mongo-stream');
console.log('Current version:', currentVersion);

// Stream history
(async () => {
    console.log('\nProtocol History:');
    for await (const entry of tracker.streamHistory('mongo-stream')) {
        console.log(`- ${entry.timestamp}: ${entry.description} (v${entry.version})`);
    }
})();
