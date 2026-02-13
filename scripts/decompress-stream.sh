#!/bin/bash
# scripts/decompress-stream.sh - Unix pipe-based decompression
# Usage: ./decompress-stream.sh [gzip|bzip2|xz] < input > output

ALGORITHM=${1:-gzip}

case $ALGORITHM in
  gzip)
    gunzip -c
    ;;
  bzip2)
    bunzip2 -c
    ;;
  xz)
    unxz -c
    ;;
  zstd)
    unzstd -c
    ;;
  auto)
    # Auto-detect based on magic bytes
    file -b - | grep -q "gzip" && gunzip -c || \
    file -b - | grep -q "bzip2" && bunzip2 -c || \
    file -b - | grep -q "XZ" && unxz -c || \
    cat
    ;;
  *)
    echo "Unknown algorithm: $ALGORITHM" >&2
    exit 1
    ;;
esac
