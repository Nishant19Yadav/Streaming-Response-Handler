// server.js - Express streaming server with adaptive buffering
const express = require('express');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'streaming_db';

// Adaptive buffer configuration
const BUFFER_CONFIG = {
  minSize: 16 * 1024,      // 16KB minimum
  maxSize: 1024 * 1024,    // 1MB maximum
  initialSize: 64 * 1024,  // 64KB initial
  adjustmentFactor: 1.5,   // Grow by 50% when slow
  shrinkFactor: 0.8,       // Shrink by 20% when fast
  slowThreshold: 100,      // ms - above this is considered slow
  fastThreshold: 20        // ms - below this is considered fast
};

class AdaptiveBuffer extends Transform {
  constructor(options = {}) {
    super({
      highWaterMark: BUFFER_CONFIG.initialSize,
      ...options
    });
    
    this.currentBufferSize = BUFFER_CONFIG.initialSize;
    this.lastDrainTime = Date.now();
    this.responseTimes = [];
    this.maxSamples = 10;
    this.isAdjusting = false;
  }

  _transform(chunk, encoding, callback) {
    const startTime = Date.now();
    
    // Track response time for adaptive sizing
    const processChunk = () => {
      this.push(chunk);
      const duration = Date.now() - startTime;
      this.responseTimes.push(duration);
      
      if (this.responseTimes.length > this.maxSamples) {
        this.responseTimes.shift();
      }
      
      // Adjust buffer size based on performance
      this.adjustBufferSize();
      callback();
    };

    // Simulate backpressure handling
    if (this._writableState.needDrain) {
      setTimeout(processChunk, 10);
    } else {
      processChunk();
    }
  }

  adjustBufferSize() {
    if (this.isAdjusting || this.responseTimes.length < 5) return;
    
    const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    if (avgResponseTime > BUFFER_CONFIG.slowThreshold && this.currentBufferSize < BUFFER_CONFIG.maxSize) {
      // Client is slow, increase buffer to reduce system calls
      const newSize = Math.min(
        this.currentBufferSize * BUFFER_CONFIG.adjustmentFactor,
        BUFFER_CONFIG.maxSize
      );
      this._updateBufferSize(newSize, 'increasing');
    } else if (avgResponseTime < BUFFER_CONFIG.fastThreshold && this.currentBufferSize > BUFFER_CONFIG.minSize) {
      // Client is fast, decrease buffer to reduce latency
      const newSize = Math.max(
        this.currentBufferSize * BUFFER_CONFIG.shrinkFactor,
        BUFFER_CONFIG.minSize
      );
      this._updateBufferSize(newSize, 'decreasing');
    }
  }

  _updateBufferSize(newSize, direction) {
    this.isAdjusting = true;
    const oldSize = this.currentBufferSize;
    this.currentBufferSize = Math.floor(newSize);
    
    // Update highWaterMark dynamically
    this._writableState.highWaterMark = this.currentBufferSize;
    this._readableState.highWaterMark = this.currentBufferSize;
    
    console.log(`[AdaptiveBuffer] ${direction}: ${oldSize} -> ${this.currentBufferSize} bytes (avg response: ${this.responseTimes.reduce((a,b)=>a+b,0)/this.responseTimes.length}ms)`);
    
    setTimeout(() => {
      this.isAdjusting = false;
      this.responseTimes = [];
    }, 1000);
  }

  getStats() {
    return {
      currentBufferSize: this.currentBufferSize,
      responseTimeHistory: this.responseTimes,
      writableBufferLength: this._writableState.length,
      readableBufferLength: this._readableState.length
    };
  }
}

// MongoDB Streaming Service
class MongoStreamService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5
    });
    await this.client.connect();
    this.db = this.client.db(DB_NAME);
    console.log('[MongoDB] Connected successfully');
  }

  // Stream large result sets using cursors with batch processing
  async *streamCollection(collectionName, query = {}, options = {}) {
    const collection = this.db.collection(collectionName);
    const batchSize = options.batchSize || 1000;
    
    const cursor = collection.find(query, {
      batchSize: batchSize,
      cursor: {
        timeout: false
      },
      allowDiskUse: true // For large aggregations
    });

    let batch = [];
    let count = 0;

    try {
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);
        count++;

        if (batch.length >= batchSize) {
          yield batch;
          batch = [];
          
          // Log progress for large datasets
          if (count % 10000 === 0) {
            console.log(`[MongoStream] Processed ${count} documents`);
          }
        }
      }

      // Yield remaining documents
      if (batch.length > 0) {
        yield batch;
      }
    } finally {
      await cursor.close();
      console.log(`[MongoStream] Total documents streamed: ${count}`);
    }
  }

  // Stream with transformation pipeline
  streamWithTransform(collectionName, transformFn, query = {}) {
    const self = this;
    
    return new Readable({
      objectMode: true,
      async read() {
        try {
          const generator = self.streamCollection(collectionName, query);
          let done = false;

          while (!done) {
            const result = await generator.next();
            done = result.done;
            
            if (!done) {
              const transformed = transformFn(result.value);
              if (!this.push(transformed)) {
                // Backpressure - wait for drain
                await new Promise(resolve => this.once('drain', resolve));
              }
            }
          }
          
          this.push(null);
        } catch (err) {
          this.destroy(err);
        }
      }
    });
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('[MongoDB] Connection closed');
    }
  }
}

// Compression Stream Handler using Unix pipes via shell scripts
class CompressionStream {
  constructor(algorithm = 'gzip') {
    this.algorithm = algorithm;
  }

  createCompressStream() {
    // Use Unix pipes for efficient streaming compression
    const compressScript = path.join(__dirname, 'scripts', 'compress-stream.sh');
    
    const child = spawn('bash', [compressScript, this.algorithm], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stderr.on('data', (data) => {
      console.error(`[Compression] ${data}`);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Compression] Process exited with code ${code}`);
      }
    });

    return {
      stdin: child.stdin,
      stdout: child.stdout,
      process: child
    };
  }

  // Alternative: Node.js native compression for comparison
  createNativeGzip() {
    const zlib = require('zlib');
    return zlib.createGzip({
      level: 6,
      chunkSize: 16 * 1024
    });
  }
}

// Express Routes with Streaming
const mongoService = new MongoStreamService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stream large dataset with adaptive buffering and compression
app.get('/api/stream/large-dataset', async (req, res) => {
  const collectionName = req.query.collection || 'large_data';
  const compress = req.query.compress === 'true';
  
  res.setHeader('Content-Type', compress ? 'application/gzip' : 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  
  if (compress) {
    res.setHeader('Content-Encoding', 'gzip');
  }

  const adaptiveBuffer = new AdaptiveBuffer({ objectMode: true });
  
  // Transform MongoDB batches to JSON lines
  const jsonTransformer = new Transform({
    objectMode: true,
    transform(batch, encoding, callback) {
      const lines = batch.map(doc => JSON.stringify(doc)).join('\n') + '\n';
      callback(null, lines);
    }
  });

  try {
    const mongoStream = mongoService.streamWithTransform(
      collectionName,
      (batch) => batch,
      {}
    );

    let finalStream;
    
    if (compress) {
      // Use shell script compression with Unix pipes
      const compression = new CompressionStream('gzip');
      const { stdin, stdout } = compression.createCompressStream();
      
      // Pipeline: Mongo -> JSON Transform -> Adaptive Buffer -> Compression -> Response
      await pipelineAsync(
        mongoStream,
        jsonTransformer,
        adaptiveBuffer,
        stdin
      );
      
      finalStream = stdout;
    } else {
      finalStream = mongoStream.pipe(jsonTransformer).pipe(adaptiveBuffer);
    }

    // Handle client disconnect
    req.on('close', () => {
      console.log('[Stream] Client disconnected');
      if (finalStream.destroy) finalStream.destroy();
    });

    await pipelineAsync(finalStream, res);
    
  } catch (err) {
    console.error('[Stream Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming failed' });
    }
  }
});

// Real-time log streaming with backpressure handling
app.get('/api/stream/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  const logStream = new Readable({
    read() {}
  });

  // Simulate log generation
  let counter = 0;
  const interval = setInterval(() => {
    if (counter >= 1000) {
      clearInterval(interval);
      logStream.push(null);
      return;
    }
    
    const logLine = `[${new Date().toISOString()}] Log entry ${counter++}\n`;
    
    // Check backpressure
    if (!logStream.push(logLine)) {
      console.log('[Backpressure] Pausing log generation');
      clearInterval(interval);
      
      logStream.once('drain', () => {
        console.log('[Backpressure] Resuming log generation');
        // Resume logic would go here
      });
    }
  }, 10);

  pipeline(logStream, res, (err) => {
    if (err) console.error('[Log Stream Error]', err);
    clearInterval(interval);
  });
});

// Stream file with adaptive buffering
app.get('/api/stream/file/:filename', async (req, res) => {
  const filePath = path.join(__dirname, 'files', req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/octet-stream');

  const fileStream = fs.createReadStream(filePath, {
    highWaterMark: BUFFER_CONFIG.initialSize
  });

  const adaptiveBuffer = new AdaptiveBuffer();

  // Monitor backpressure
  fileStream.on('data', (chunk) => {
    const backpressure = fileStream._readableState.length > fileStream._readableState.highWaterMark;
    if (backpressure) {
      console.log('[File Stream] Backpressure detected, throttling...');
      fileStream.pause();
      setTimeout(() => fileStream.resume(), 100);
    }
  });

  try {
    await pipelineAsync(fileStream, adaptiveBuffer, res);
    console.log('[File Stream] Completed:', req.params.filename);
  } catch (err) {
    console.error('[File Stream Error]', err);
  }
});

// Admin endpoint to check buffer stats
app.get('/admin/buffer-stats', (req, res) => {
  // This would track active streams in production
  res.json({
    config: BUFFER_CONFIG,
    activeStreams: global.activeStreams || 0,
    memoryUsage: process.memoryUsage()
  });
});

// Error handling for streams
app.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing connections...');
  await mongoService.close();
  process.exit(0);
});

// Initialize and start
async function start() {
  await mongoService.connect();
  
  app.listen(PORT, () => {
    console.log(`[Server] Streaming server running on port ${PORT}`);
    console.log(`[Config] Adaptive buffer: ${BUFFER_CONFIG.initialSize} -> ${BUFFER_CONFIG.maxSize} bytes`);
  });
}

start().catch(console.error);

module.exports = { app, AdaptiveBuffer, MongoStreamService };
