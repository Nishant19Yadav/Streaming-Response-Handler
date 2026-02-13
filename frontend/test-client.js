// test-client.js - Client to test adaptive buffering behavior
const http = require('http');
const fs = require('fs');
const { performance } = require('perf_hooks');

class StreamingClient {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    async testEndpoint(endpoint, options = {}) {
        const {
            name = endpoint,
            saveToFile = null,
            slowDown = false,
            maxBytes = null
        } = options;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${name}`);
        console.log(`${'='.repeat(60)}`);

        const startTime = performance.now();
        let bytesReceived = 0;
        let chunks = 0;
        let backpressureEvents = 0;

        return new Promise((resolve, reject) => {
            const url = this.baseUrl + endpoint;
            console.log(`URL: ${url}\n`);

            const req = http.get(url, (res) => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Headers:`, res.headers);
                console.log('');

                let fileStream = null;
                if (saveToFile) {
                    fileStream = fs.createWriteStream(saveToFile);
                }

                let lastChunkTime = performance.now();
                let chunkTimes = [];

                res.on('data', (chunk) => {
                    const now = performance.now();
                    const timeSinceLastChunk = now - lastChunkTime;
                    chunkTimes.push(timeSinceLastChunk);

                    // Detect potential backpressure
                    if (timeSinceLastChunk > 100) {
                        backpressureEvents++;
                    }

                    bytesReceived += chunk.length;
                    chunks++;

                    // Log progress every 100 chunks
                    if (chunks % 100 === 0) {
                        const throughput = (bytesReceived / (now - startTime) * 1000 / 1024 / 1024).toFixed(2);
                        console.log(`Progress: ${chunks} chunks, ${(bytesReceived / 1024 / 1024).toFixed(2)} MB, ${throughput} MB/s`);
                    }

                    if (fileStream) {
                        fileStream.write(chunk);
                    }

                    // Simulate slow client if requested
                    if (slowDown && chunks % 10 === 0) {
                        res.pause();
                        setTimeout(() => res.resume(), 50);
                    }

                    // Stop after maxBytes if specified
                    if (maxBytes && bytesReceived >= maxBytes) {
                        req.destroy();
                    }
                });

                res.on('end', () => {
                    if (fileStream) {
                        fileStream.end();
                    }

                    const duration = performance.now() - startTime;
                    const avgChunkTime = chunkTimes.length > 0
                        ? chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length
                        : 0;

                    const results = {
                        endpoint: name,
                        duration: duration.toFixed(2) + ' ms',
                        bytesReceived,
                        chunks,
                        throughput: ((bytesReceived / duration) * 1000 / 1024 / 1024).toFixed(2) + ' MB/s',
                        backpressureEvents,
                        avgChunkSize: (bytesReceived / chunks).toFixed(2) + ' bytes',
                        avgChunkTime: avgChunkTime.toFixed(2) + ' ms'
                    };

                    console.log('\n📊 Results:');
                    console.log(JSON.stringify(results, null, 2));
                    resolve(results);
                });

                res.on('error', reject);
            });

            req.on('error', reject);
        });
    }

    async runAllTests() {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║         Adaptive Streaming System - Test Suite            ║
╚════════════════════════════════════════════════════════════╝
    `);

        const results = [];

        try {
            // Test 1: Small dataset (fast)
            results.push(await this.testEndpoint('/api/stream/large-dataset?count=100', {
                name: 'Small Dataset (100 docs)'
            }));

            await this.sleep(1000);

            // Test 2: Medium dataset
            results.push(await this.testEndpoint('/api/stream/large-dataset?count=5000', {
                name: 'Medium Dataset (5000 docs)'
            }));

            await this.sleep(1000);

            // Test 3: Log stream
            results.push(await this.testEndpoint('/api/stream/logs', {
                name: 'Real-time Logs (1000 entries)'
            }));

            await this.sleep(1000);

            // Test 4: File stream (first 10MB only)
            results.push(await this.testEndpoint('/api/stream/file/large-file.bin', {
                name: 'File Stream (10MB sample)',
                saveToFile: 'test-output.bin',
                maxBytes: 10 * 1024 * 1024
            }));

            await this.sleep(1000);

            // Test 5: Slow client simulation
            results.push(await this.testEndpoint('/api/stream/large-dataset?count=1000', {
                name: 'Slow Client Test (throttled)',
                slowDown: true
            }));

            // Summary
            console.log(`\n${'='.repeat(60)}`);
            console.log('📈 Test Summary');
            console.log(`${'='.repeat(60)}\n`);

            results.forEach((result, i) => {
                console.log(`${i + 1}. ${result.endpoint}`);
                console.log(`   Throughput: ${result.throughput}`);
                console.log(`   Chunks: ${result.chunks}, Backpressure: ${result.backpressureEvents}`);
                console.log('');
            });

            console.log('✅ All tests completed successfully!\n');

        } catch (err) {
            console.error('❌ Test failed:', err.message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if executed directly
if (require.main === module) {
    const client = new StreamingClient();
    client.runAllTests().catch(console.error);
}

module.exports = StreamingClient;
