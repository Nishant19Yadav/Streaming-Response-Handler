// lib/backpressure-handler.js - Advanced backpressure management
const { EventEmitter } = require('events');

class BackpressureManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.highWaterMark = options.highWaterMark || 16 * 1024;
        this.lowWaterMark = options.lowWaterMark || 4 * 1024;
        this.maxQueueSize = options.maxQueueSize || 100;
        this.queue = [];
        this.paused = false;
        this.processing = false;
        this.stats = {
            totalProcessed: 0,
            totalPaused: 0,
            totalResumed: 0,
            currentQueueDepth: 0,
            avgProcessingTime: 0
        };
    }

    async write(chunk, writeFn) {
        if (this.paused) {
            await this._waitForResume();
        }

        const startTime = Date.now();

        try {
            const canContinue = writeFn(chunk);
            this.stats.totalProcessed++;

            const processingTime = Date.now() - startTime;
            this._updateAvgProcessingTime(processingTime);

            if (!canContinue) {
                await this._handleBackpressure();
            }

            return true;
        } catch (err) {
            this.emit('error', err);
            throw err;
        }
    }

    _updateAvgProcessingTime(time) {
        const alpha = 0.1; // Exponential moving average
        this.stats.avgProcessingTime =
            (alpha * time) + ((1 - alpha) * this.stats.avgProcessingTime);
    }

    async _handleBackpressure() {
        this.paused = true;
        this.stats.totalPaused++;
        this.emit('pause');

        return new Promise((resolve) => {
            this.once('resume', () => {
                this.paused = false;
                this.stats.totalResumed++;
                resolve();
            });
        });
    }

    _waitForResume() {
        return new Promise((resolve) => {
            this.once('resume', resolve);
        });
    }

    signalDrain() {
        if (this.paused) {
            this.emit('resume');
        }
    }

    getStats() {
        return {
            ...this.stats,
            isPaused: this.paused,
            queueDepth: this.queue.length,
            memoryUsage: process.memoryUsage()
        };
    }
}

// Rate-limited stream wrapper
class RateLimitedStream {
    constructor(stream, bytesPerSecond) {
        this.stream = stream;
        this.rate = bytesPerSecond;
        this.tokens = bytesPerSecond;
        this.lastCheck = Date.now();
        this.interval = 1000 / 60; // 60 FPS check
    }

    async process(chunk) {
        const now = Date.now();
        const elapsed = now - this.lastCheck;
        this.lastCheck = now;

        // Token bucket algorithm
        this.tokens += (elapsed / 1000) * this.rate;
        this.tokens = Math.min(this.tokens, this.rate);

        const chunkSize = Buffer.byteLength(chunk);

        if (chunkSize > this.tokens) {
            const waitTime = ((chunkSize - this.tokens) / this.rate) * 1000;
            await this._sleep(waitTime);
            this.tokens = 0;
        } else {
            this.tokens -= chunkSize;
        }

        return this.stream.write(chunk);
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { BackpressureManager, RateLimitedStream };
