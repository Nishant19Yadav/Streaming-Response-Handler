const { Transform } = require('stream');

const BUFFER_CONFIG = {
    minSize: 32 * 1024,      // 32KB minimum
    maxSize: 2 * 1024 * 1024, // 2MB maximum
    initialSize: 128 * 1024,  // 128KB initial
    adjustmentFactor: 1.5,
    shrinkFactor: 0.8,
    slowThreshold: 150,      // ms
    fastThreshold: 30        // ms
};

class AdaptiveBuffer extends Transform {
    constructor(options = {}) {
        super({
            highWaterMark: BUFFER_CONFIG.initialSize,
            ...options
        });

        this.currentBufferSize = BUFFER_CONFIG.initialSize;
        this.responseTimes = [];
        this.maxSamples = 10;
        this.isAdjusting = false;
        this.stats = {
            adjustments: 0,
            lastDirection: 'initial'
        };
    }

    _transform(chunk, encoding, callback) {
        const startTime = Date.now();

        const processChunk = () => {
            this.push(chunk);
            const duration = Date.now() - startTime;
            this.responseTimes.push(duration);

            if (this.responseTimes.length > this.maxSamples) {
                this.responseTimes.shift();
            }

            this.adjustBufferSize();
            callback();
        };

        // Handle backpressure
        if (this._writableState.needDrain) {
            this.once('drain', processChunk);
        } else {
            processChunk();
        }
    }

    adjustBufferSize() {
        if (this.isAdjusting || this.responseTimes.length < 5) return;

        const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

        let newSize = this.currentBufferSize;
        let direction = '';

        if (avgResponseTime > BUFFER_CONFIG.slowThreshold && this.currentBufferSize < BUFFER_CONFIG.maxSize) {
            newSize = Math.min(this.currentBufferSize * BUFFER_CONFIG.adjustmentFactor, BUFFER_CONFIG.maxSize);
            direction = 'increasing';
        } else if (avgResponseTime < BUFFER_CONFIG.fastThreshold && this.currentBufferSize > BUFFER_CONFIG.minSize) {
            newSize = Math.max(this.currentBufferSize * BUFFER_CONFIG.shrinkFactor, BUFFER_CONFIG.minSize);
            direction = 'decreasing';
        }

        if (direction) {
            this._updateBufferSize(newSize, direction, avgResponseTime);
        }
    }

    _updateBufferSize(newSize, direction, avgTime) {
        this.isAdjusting = true;
        this.currentBufferSize = Math.floor(newSize);
        this._writableState.highWaterMark = this.currentBufferSize;
        this._readableState.highWaterMark = this.currentBufferSize;
        this.stats.adjustments++;
        this.stats.lastDirection = direction;

        console.log(`[AdaptiveBuffer] ${direction}: ${this.currentBufferSize} bytes (avg: ${Math.round(avgTime)}ms)`);

        // Cooldown for stability
        setTimeout(() => {
            this.isAdjusting = false;
        }, 2000);
    }
}

module.exports = AdaptiveBuffer;
