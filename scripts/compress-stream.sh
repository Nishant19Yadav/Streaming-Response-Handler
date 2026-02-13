#!/bin/bash
# scripts/compress-stream.sh - Unix pipe-based compression
# Usage: ./compress-stream.sh [gzip|bzip2|xz]

ALGORITHM=${1:-gzip}

case $ALGORITHM in
  gzip)
    # Use pigz for parallel gzip if available, fallback to gzip
    if command -v pigz &> /dev/null; then
      pigz -c -6
    else
      gzip -c -6
    fi
    ;;
  bzip2)
    # Use pbzip2 for parallel bzip2 if available
    if command -v pbzip2 &> /dev/null; then
      pbzip2 -c -6
    else
      bzip2 -c -6
    fi
    ;;
  xz)
    xz -c -6
    ;;
  zstd)
    zstd -c -6
    ;;
  *)
    echo "Unknown algorithm: $ALGORITHM" >&2
    exit 1
    ;;
esac
