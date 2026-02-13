# Adaptive Streaming System

A high-performance Node.js streaming system with adaptive buffering, MongoDB cursor streaming, Unix pipe integration, and Git-based protocol tracking.

## 🚀 Features

### Core Capabilities
- **Adaptive Buffering**: Dynamic buffer sizing (16KB-1MB) based on client response times
- **MongoDB Streaming**: Efficient cursor-based streaming with batch processing
- **Backpressure Management**: Sophisticated pause/resume mechanisms with metrics
- **Unix Pipe Integration**: Shell script-based compression using pigz, pbzip2, xz, zstd
- **Protocol Versioning**: Git-based tracking of streaming protocol changes
- **Rate Limiting**: Token bucket algorithm for bandwidth control

### Architecture Highlights
- **Memory Efficient**: Streams data in chunks without buffering entire datasets
- **Production Ready**: Docker orchestration, graceful shutdown, comprehensive error handling
- **Observable**: Buffer stats endpoint, detailed logging, performance metrics
- **Flexible Compression**: Multiple algorithms with automatic fallback

## 📋 Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose (optional, for full stack)
- Git
- MongoDB (or use Docker Compose)

## 🛠️ Installation

### Quick Start (Windows)

```powershell
# Install dependencies
npm install

# Generate test data and initialize protocol tracking
node -e "const GitProtocolTracker = require('./lib/git-tracker'); const tracker = new GitProtocolTracker(); tracker.trackProtocolChange('mongo-stream', {version: '1.0.0', batchSize: 1000}, {description: 'Initial protocol'});"

# Start MongoDB (if not using Docker)
# Ensure MongoDB is running on localhost:27017

# Start the server
npm start
```

### Full Stack with Docker

```bash
# Start all services (MongoDB, Redis, App, Log Processor)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🎯 API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Stream Large Dataset
```bash
# Uncompressed JSON stream
curl http://localhost:3000/api/stream/large-dataset?collection=large_data&compress=false

# Compressed stream (gzip via Unix pipes)
curl http://localhost:3000/api/stream/large-dataset?collection=large_data&compress=true
```

### Stream File
```bash
curl http://localhost:3000/api/stream/file/large-file.bin -o output.bin
```

### Real-time Logs
```bash
curl http://localhost:3000/api/stream/logs
```

### Admin Stats
```bash
curl http://localhost:3000/admin/buffer-stats
```

## 🧪 Testing & Benchmarks

### Run Performance Benchmarks
```bash
npm run benchmark
```

Expected output:
```
--- Uncompressed Mongo Stream ---
{
  duration: '5234.56',
  bytesReceived: 52428800,
  chunks: 512,
  throughput: '9.54 MB/s',
  backpressureEvents: 3,
  avgChunkSize: '102400.00'
}
```

### Track Protocol Changes
```bash
npm run protocol:track
```

## 📊 Adaptive Buffering

The system automatically adjusts buffer sizes based on performance:

- **Slow Client** (>100ms avg response): Increases buffer → Reduces system calls
- **Fast Client** (<20ms avg response): Decreases buffer → Reduces latency
- **Adjustment Range**: 16KB (min) to 1MB (max)
- **Growth Factor**: 1.5x when slow
- **Shrink Factor**: 0.8x when fast

### Example Log Output
```
[AdaptiveBuffer] increasing: 65536 -> 98304 bytes (avg response: 125ms)
[AdaptiveBuffer] decreasing: 98304 -> 78643 bytes (avg response: 15ms)
```

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000                                    # Server port
MONGO_URI=mongodb://localhost:27017          # MongoDB connection
UV_THREADPOOL_SIZE=128                       # Node.js thread pool size
CHUNK_SIZE=65536                             # Unix pipe chunk size
```

### Buffer Configuration (server.js)
```javascript
const BUFFER_CONFIG = {
  minSize: 16 * 1024,      // 16KB minimum
  maxSize: 1024 * 1024,    // 1MB maximum
  initialSize: 64 * 1024,  // 64KB initial
  adjustmentFactor: 1.5,   // Grow by 50%
  shrinkFactor: 0.8,       // Shrink by 20%
  slowThreshold: 100,      // ms
  fastThreshold: 20        // ms
};
```

## 📁 Project Structure

```
adaptive-streaming-system/
├── server.js                    # Main Express server
├── lib/
│   ├── backpressure-handler.js  # Backpressure management
│   └── git-tracker.js           # Protocol version tracking
├── scripts/
│   ├── compress-stream.sh       # Unix pipe compression
│   ├── decompress-stream.sh     # Decompression
│   ├── stream-processor.sh      # Multi-stage processor
│   └── track-protocol.js        # Protocol tracking CLI
├── benchmarks/
│   └── stream-benchmark.js      # Performance tests
├── files/                       # Test data files
├── logs/                        # Application logs
├── protocol-repo/               # Git-tracked protocols
├── docker-compose.yml           # Full stack orchestration
├── Dockerfile                   # App container
├── Dockerfile.logs              # Log processor container
└── package.json
```

## 🔍 Key Components

### 1. AdaptiveBuffer (server.js)
Transform stream that dynamically adjusts buffer size based on client performance metrics.

### 2. MongoStreamService (server.js)
Handles MongoDB cursor streaming with:
- Generator-based async iteration
- Configurable batch sizes
- Progress logging for large datasets
- Automatic cursor cleanup

### 3. CompressionStream (server.js)
Spawns shell scripts for Unix pipe-based compression:
- Supports: gzip, bzip2, xz, zstd
- Auto-detects parallel tools (pigz, pbzip2)
- Fallback to standard tools

### 4. GitProtocolTracker (lib/git-tracker.js)
Tracks streaming protocol changes:
- SHA-256 based versioning
- Changelog generation
- Diff between versions
- Streaming history access

### 5. BackpressureManager (lib/backpressure-handler.js)
Advanced backpressure handling:
- Pause/resume mechanisms
- Exponential moving average tracking
- Queue depth monitoring
- Event-based signaling

## 🐳 Docker Services

- **app**: Node.js streaming server (port 3000)
- **mongo**: MongoDB 6 with adaptive executor
- **redis**: Redis 7 for caching
- **log-processor**: Unix pipe-based log aggregation

## 📈 Performance Tips

1. **Increase Thread Pool**: Set `UV_THREADPOOL_SIZE=128` for high concurrency
2. **Tune MongoDB**: Use `--wiredTigerCacheSizeGB` based on available RAM
3. **Use Parallel Compression**: Install `pigz` and `pbzip2` for faster compression
4. **Monitor Buffer Stats**: Check `/admin/buffer-stats` for optimization insights
5. **Adjust Batch Size**: Tune MongoDB batch size based on document size

## 🔒 Security

- Non-root user in Docker containers
- Input validation on all endpoints
- Graceful shutdown handling
- Client disconnect detection
- Resource limits in Docker Compose

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional compression algorithms
- More sophisticated adaptive algorithms
- WebSocket streaming support
- Metrics dashboard
- Load testing suite

## 📞 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ using Node.js Streams, Unix Pipes, and Git**
