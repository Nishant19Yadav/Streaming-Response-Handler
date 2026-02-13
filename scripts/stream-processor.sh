#!/bin/bash
# scripts/stream-processor.sh - Advanced Unix pipe chain for stream processing
# Demonstrates efficient Unix pipe forwarding

set -euo pipefail

INPUT="${1:-/dev/stdin}"
OUTPUT="${2:-/dev/stdout}"
CHUNK_SIZE="${CHUNK_SIZE:-65536}"

# Function to setup pipeline with proper error handling
setup_pipeline() {
    local cmd="$1"
    
    # Use stdbuf to control buffering
    # unbuffered (-i0) for input, line buffered (-oL) for output
    stdbuf -i0 -oL "$cmd"
}

# Example processing chain: 
# 1. Buffer input
# 2. Filter/transform
# 3. Compress
# 4. Output

process_stream() {
    # Stage 1: Buffer and chunk
    # Using dd with specific block size for efficiency
    dd bs="$CHUNK_SIZE" iflag=fullblock 2>/dev/null |
    
    # Stage 2: Optional filtering (example: JSON extraction)
    # grep -oP '"value":\s*\K[0-9.]+' |
    
    # Stage 3: Transform (example: add timestamp)
    while IFS= read -r line; do
        echo "[$(date -Iseconds)] $line"
    done |
    
    # Stage 4: Compress on-the-fly
    "$(dirname "$0")/compress-stream.sh" gzip
}

# Main execution
if [[ "$INPUT" == "/dev/stdin" ]]; then
    process_stream > "$OUTPUT"
else
    process_stream < "$INPUT" > "$OUTPUT"
fi
