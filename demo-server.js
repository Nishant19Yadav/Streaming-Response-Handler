// demo-server.js - Standalone demo without MongoDB dependency
const express = require('express');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

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

        console.log(`[AdaptiveBuffer] ${direction}: ${oldSize} -> ${this.currentBufferSize} bytes (avg response: ${Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)}ms)`);

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

// Generate mock data stream
function createMockDataStream(count = 10000) {
    let counter = 0;

    return new Readable({
        objectMode: true,
        read() {
            if (counter >= count) {
                this.push(null);
                return;
            }

            // Generate mock document
            const doc = {
                id: counter,
                timestamp: new Date().toISOString(),
                value: Math.random() * 1000,
                status: counter % 2 === 0 ? 'active' : 'inactive',
                metadata: {
                    source: 'demo-generator',
                    batch: Math.floor(counter / 100)
                }
            };

            counter++;
            this.push(doc);
        }
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mode: 'demo',
        message: 'Running in demo mode without MongoDB'
    });
});

// Stream mock dataset with adaptive buffering
app.get('/api/stream/large-dataset', async (req, res) => {
    const count = parseInt(req.query.count) || 10000;
    const delay = parseInt(req.query.delay) || 0; // Simulate slow processing

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    const mockStream = createMockDataStream(count);
    const adaptiveBuffer = new AdaptiveBuffer({ objectMode: true });

    // Transform to JSON lines
    const jsonTransformer = new Transform({
        objectMode: true,
        transform(doc, encoding, callback) {
            if (delay > 0) {
                setTimeout(() => {
                    callback(null, JSON.stringify(doc) + '\n');
                }, delay);
            } else {
                callback(null, JSON.stringify(doc) + '\n');
            }
        }
    });

    try {
        console.log(`[Stream] Starting dataset stream: ${count} documents`);

        // Handle client disconnect
        req.on('close', () => {
            console.log('[Stream] Client disconnected');
            mockStream.destroy();
        });

        await pipelineAsync(mockStream, jsonTransformer, adaptiveBuffer, res);
        console.log('[Stream] Completed successfully');

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
        read() { }
    });

    // Simulate log generation
    let counter = 0;
    const maxLogs = 1000;
    const interval = setInterval(() => {
        if (counter >= maxLogs) {
            clearInterval(interval);
            logStream.push(null);
            return;
        }

        const logLine = `[${new Date().toISOString()}] Log entry ${counter++} - ${Math.random().toString(36).substring(7)}\n`;

        // Check backpressure
        if (!logStream.push(logLine)) {
            console.log('[Backpressure] Pausing log generation');
            clearInterval(interval);

            logStream.once('drain', () => {
                console.log('[Backpressure] Resuming log generation');
            });
        }
    }, 10);

    req.on('close', () => {
        clearInterval(interval);
        console.log('[Log Stream] Client disconnected');
    });

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
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);

    const fileStream = fs.createReadStream(filePath, {
        highWaterMark: BUFFER_CONFIG.initialSize
    });

    const adaptiveBuffer = new AdaptiveBuffer();

    // Monitor backpressure
    let backpressureCount = 0;
    fileStream.on('data', (chunk) => {
        const backpressure = fileStream._readableState.length > fileStream._readableState.highWaterMark;
        if (backpressure) {
            backpressureCount++;
            console.log(`[File Stream] Backpressure detected (${backpressureCount}), throttling...`);
            fileStream.pause();
            setTimeout(() => fileStream.resume(), 100);
        }
    });

    try {
        await pipelineAsync(fileStream, adaptiveBuffer, res);
        console.log(`[File Stream] Completed: ${req.params.filename} (${stat.size} bytes, ${backpressureCount} backpressure events)`);
    } catch (err) {
        console.error('[File Stream Error]', err);
    }
});

// Admin endpoint to check buffer stats
app.get('/admin/buffer-stats', (req, res) => {
    res.json({
        config: BUFFER_CONFIG,
        activeStreams: global.activeStreams || 0,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
    });
});

// Demo landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling for streams
app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Adaptive Streaming System - Demo Mode                 ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                   ║
║  Mode: Demo (No MongoDB required)                          ║
║                                                            ║
║  Adaptive Buffer Config:                                   ║
║    - Initial: ${BUFFER_CONFIG.initialSize / 1024}KB                                        ║
║    - Range: ${BUFFER_CONFIG.minSize / 1024}KB - ${BUFFER_CONFIG.maxSize / 1024}KB                                  ║
║                                                            ║
║  Open http://localhost:${PORT} in your browser              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, AdaptiveBuffer };
