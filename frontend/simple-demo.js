// simple-demo.js - Quick demonstration of adaptive buffering
const http = require('http');

console.log(`
╔════════════════════════════════════════════════════════════╗
║     Adaptive Streaming System - Quick Demo                 ║
╚════════════════════════════════════════════════════════════╝

This demo will show you the adaptive buffering in action.
Watch the server console for buffer size adjustments!

Server: http://localhost:3000
`);

async function demo() {
    console.log('📊 Test 1: Fast Client (Small Dataset)');
    console.log('Expected: Buffer may decrease due to fast processing\n');

    await new Promise((resolve) => {
        http.get('http://localhost:3000/api/stream/large-dataset?count=1000', (res) => {
            let bytes = 0;
            res.on('data', (chunk) => {
                bytes += chunk.length;
            });
            res.on('end', () => {
                console.log(`✅ Received ${bytes} bytes\n`);
                resolve();
            });
        });
    });

    await sleep(2000);

    console.log('📊 Test 2: Log Stream');
    console.log('Expected: Real-time streaming with backpressure handling\n');

    await new Promise((resolve) => {
        http.get('http://localhost:3000/api/stream/logs', (res) => {
            let lines = 0;
            let buffer = '';

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const newLines = buffer.split('\n');
                buffer = newLines.pop();
                lines += newLines.length;

                if (lines % 100 === 0) {
                    process.stdout.write(`\rReceived ${lines} log lines...`);
                }
            });

            res.on('end', () => {
                console.log(`\n✅ Received ${lines} log lines\n`);
                resolve();
            });
        });
    });

    await sleep(2000);

    console.log('📊 Test 3: File Stream (First 5MB)');
    console.log('Expected: Adaptive buffering based on network speed\n');

    await new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/stream/file/large-file.bin', (res) => {
            let bytes = 0;
            const maxBytes = 5 * 1024 * 1024;

            res.on('data', (chunk) => {
                bytes += chunk.length;

                if (bytes % (1024 * 1024) === 0) {
                    process.stdout.write(`\rReceived ${(bytes / 1024 / 1024).toFixed(2)} MB...`);
                }

                if (bytes >= maxBytes) {
                    req.destroy();
                }
            });

            res.on('end', () => {
                console.log(`\n✅ Received ${(bytes / 1024 / 1024).toFixed(2)} MB\n`);
                resolve();
            });

            res.on('close', () => {
                console.log(`\n✅ Received ${(bytes / 1024 / 1024).toFixed(2)} MB (stopped early)\n`);
                resolve();
            });
        });
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Demo Complete! ✅                        ║
╠════════════════════════════════════════════════════════════╣
║  Check the server console to see:                          ║
║  - [AdaptiveBuffer] increasing/decreasing messages         ║
║  - [Stream] processing logs                                ║
║  - [Backpressure] pause/resume events                      ║
╚════════════════════════════════════════════════════════════╝

Next Steps:
1. Open http://localhost:3000 in your browser
2. Try the different endpoints
3. Run 'npm run benchmark' for detailed metrics
4. Explore the code in demo-server.js
  `);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

demo().catch(console.error);
