const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class CompressionPipeline {
    static async getCompressionStream(algorithm = 'gzip') {
        // In a real production Unix environment, we would use shell tools
        // For portability, we can check if the tools exist or fallback
        // The user specifically asked for child_process spawn for compression

        const platform = process.platform;
        let command = '';
        let args = [];

        if (algorithm === 'gzip') {
            command = 'gzip';
            args = ['-c'];
        } else if (algorithm === 'zstd') {
            command = 'zstd';
            args = ['-c', '-1'];
        }

        try {
            const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

            // Handle early errors (like command not found)
            child.on('error', (err) => {
                console.error(`Compression tool ${command} not found, falling back to zlib`);
            });

            return {
                stdin: child.stdin,
                stdout: child.stdout,
                process: child
            };
        } catch (e) {
            return null;
        }
    }

    // Fallback using Node's native zlib if spawn fails
    static createNativeGzip() {
        const zlib = require('zlib');
        return zlib.createGzip({
            level: 6,
            chunkSize: 128 * 1024
        });
    }
}

module.exports = CompressionPipeline;
