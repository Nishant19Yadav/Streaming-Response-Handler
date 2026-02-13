// benchmarks/stream-benchmark.js
const http = require('http');
const { performance } = require('perf_hooks');

async function benchmarkStream(url, duration = 30000) {
    const startTime = performance.now();
    let bytesReceived = 0;
    let chunks = 0;
    let backpressureEvents = 0;

    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let lastChunkTime = startTime;

            res.on('data', (chunk) => {
                const now = performance.now();
                const timeSinceLastChunk = now - lastChunkTime;

                // Detect potential backpressure (chunks arriving slower than expected)
                if (timeSinceLastChunk > 100) {
                    backpressureEvents++;
                }

                bytesReceived += chunk.length;
                chunks++;
                lastChunkTime = now;
            });

            res.on('end', () => {
                const duration = performance.now() - startTime;
                resolve({
                    duration: duration.toFixed(2),
                    bytesReceived,
                    chunks,
                    throughput: ((bytesReceived / duration) * 1000 / 1024 / 1024).toFixed(2) + ' MB/s',
                    backpressureEvents,
                    avgChunkSize: (bytesReceived / chunks).toFixed(2)
                });
            });
        });

        req.on('error', reject);

        // Abort after duration
        setTimeout(() => {
            req.destroy();
            resolve({ aborted: true, bytesReceived, chunks });
        }, duration);
    });
}

// Run benchmarks
async function main() {
    console.log('Starting stream benchmarks...\n');

    const scenarios = [
        { name: 'Uncompressed Mongo Stream', url: 'http://localhost:3000/api/stream/large-dataset?compress=false' },
        { name: 'Compressed Mongo Stream', url: 'http://localhost:3000/api/stream/large-dataset?compress=true' },
        { name: 'File Stream', url: 'http://localhost:3000/api/stream/file/large-file.bin' },
        { name: 'Log Stream', url: 'http://localhost:3000/api/stream/logs' }
    ];

    for (const scenario of scenarios) {
        console.log(`\n--- ${scenario.name} ---`);
        try {
            const results = await benchmarkStream(scenario.url, 10000);
            console.log(results);
        } catch (err) {
            console.error('Benchmark failed:', err.message);
        }
    }
}

main();
