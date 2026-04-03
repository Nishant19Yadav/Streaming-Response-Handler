FROM node:18-alpine

# Install compression tools
RUN apk add --no-cache \
    gzip \
    pigz \
    bzip2 \
    xz \
    zstd \
    git \
    bash \
    coreutils \
    procps

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p files logs protocol-repo && \
    chmod +x scripts/*.sh

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
