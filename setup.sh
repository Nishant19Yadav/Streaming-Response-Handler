#!/bin/bash
# setup.sh - System setup and initialization

set -e

echo "🚀 Setting up Adaptive Streaming System..."

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "Node.js required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker recommended but not found."; }
command -v git >/dev/null 2>&1 || { echo "Git required but not installed. Aborting." >&2; exit 1; }

# Create directories
mkdir -p files logs protocol-repo scripts

# Install dependencies
echo "📦 Installing Node dependencies..."
npm install

# Make scripts executable
chmod +x scripts/*.sh

# Initialize Git protocol tracking
echo "📝 Initializing protocol tracking..."
node -e "
const GitProtocolTracker = require('./lib/git-tracker');
const tracker = new GitProtocolTracker();
tracker.trackProtocolChange('mongo-stream', {
  version: '1.0.0',
  batchSize: 1000,
  compression: 'gzip',
  buffering: 'adaptive'
}, { description: 'Initial streaming protocol' });
"

# Generate test data
echo "🧪 Generating test data..."
node -e "
const fs = require('fs');
const path = require('path');

// Generate 100MB test file
const size = 100 * 1024 * 1024;
const chunk = Buffer.alloc(1024 * 1024, 'x');
const stream = fs.createWriteStream(path.join('files', 'large-file.bin'));

let written = 0;
function write() {
  while (written < size) {
    if (!stream.write(chunk)) {
      stream.once('drain', write);
      return;
    }
    written += chunk.length;
  }
  stream.end();
}
write();
console.log('Generated 100MB test file');
"

echo "✅ Setup complete!"
echo ""
echo "To start the system:"
echo "  docker-compose up -d    # Start infrastructure"
echo "  npm start               # Start application"
echo "  npm run benchmark       # Run performance tests"
