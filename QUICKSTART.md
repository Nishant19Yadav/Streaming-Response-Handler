# Quick Start Guide

## 🚀 Instant Demo (No MongoDB Required)

The easiest way to see the streaming system in action:

```powershell
# Start the demo server
node demo-server.js
```

Then open your browser to: **http://localhost:3000**

You will see the **new interactive dashboard** where you can:
- VISUALIZE real-time throughput
- WATCH adaptive buffering in action
- MONITOR backpressure events
- CONTROL stream parameters

### Available Demo Endpoints

1. **Stream JSON Data**: http://localhost:3000/api/stream/large-dataset?count=1000
2. **Stream Logs**: http://localhost:3000/api/stream/logs
3. **Stream File**: http://localhost:3000/api/stream/file/large-file.bin
4. **System Stats**: http://localhost:3000/admin/buffer-stats

## 📊 Testing Adaptive Buffering

### Fast Client (Small Buffer)
```powershell
# Download quickly - buffer will shrink
curl http://localhost:3000/api/stream/large-dataset?count=10000 -o output.json
```

Watch the console for messages like:
```
[AdaptiveBuffer] decreasing: 65536 -> 52428 bytes (avg response: 15ms)
```

### Slow Client (Large Buffer)
```powershell
# Simulate slow client with rate limiting
curl --limit-rate 10K http://localhost:3000/api/stream/file/large-file.bin -o test.bin
```

Watch for:
```
[AdaptiveBuffer] increasing: 65536 -> 98304 bytes (avg response: 125ms)
```

## 🐳 Full Stack with MongoDB (Docker)

If you have Docker installed:

```powershell
# Start MongoDB, Redis, and the app
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## 💻 Local Development with MongoDB

### 1. Install MongoDB

**Windows (using Chocolatey):**
```powershell
choco install mongodb
```

**Or download from:** https://www.mongodb.com/try/download/community

### 2. Start MongoDB

```powershell
# Start MongoDB service
net start MongoDB

# Or run manually
mongod --dbpath C:\data\db
```

### 3. Start the Full Server

```powershell
node server.js
```

## 🧪 Running Benchmarks

```powershell
# Make sure the server is running first
node demo-server.js

# In another terminal, run benchmarks
npm run benchmark
```

Expected output:
```
--- Uncompressed Mongo Stream ---
{
  duration: '2341.23',
  bytesReceived: 1048576,
  chunks: 128,
  throughput: '0.43 MB/s',
  backpressureEvents: 2,
  avgChunkSize: '8192.00'
}
```

## 📝 Protocol Tracking Demo

```powershell
# Track a protocol change
npm run protocol:track

# View the git history
cd protocol-repo
git log --oneline
```

## 🔍 Monitoring in Real-Time

### Terminal 1: Start Server
```powershell
node demo-server.js
```

### Terminal 2: Open Dashboard
Open http://localhost:3000 to see the real-time visualization!

### Terminal 3: Monitor Stats (CLI Alternative)
```powershell
# Watch stats update
while ($true) { 
  curl http://localhost:3000/admin/buffer-stats | ConvertFrom-Json | Format-List
  Start-Sleep -Seconds 2
}
```

## 🎯 Testing Backpressure

```powershell
# Generate a slow stream and observe backpressure handling
curl http://localhost:3000/api/stream/large-dataset?count=100000&delay=5
```

Watch the server console for:
```
[Backpressure] Pausing log generation
[Backpressure] Resuming log generation
```

## 🐛 Troubleshooting

### Port Already in Use
```powershell
# Use a different port
$env:PORT=3001
node demo-server.js
```

### MongoDB Connection Failed
```powershell
# Use demo mode instead
node demo-server.js
```

### Missing Dependencies
```powershell
npm install
```

## 📚 Next Steps

1. **Explore the Code**: Start with `demo-server.js` to understand adaptive buffering
2. **Read the Docs**: Check `README.md` for architecture details
3. **Customize**: Modify `BUFFER_CONFIG` in the server files
4. **Add Features**: Extend with your own streaming endpoints

## 🎓 Learning Resources

- **Adaptive Buffer**: See `AdaptiveBuffer` class in `demo-server.js`
- **Backpressure**: Check the log streaming endpoint
- **Protocol Tracking**: Explore `lib/git-tracker.js`
- **Unix Pipes**: Review `scripts/compress-stream.sh`

---

**Happy Streaming! 🚀**
