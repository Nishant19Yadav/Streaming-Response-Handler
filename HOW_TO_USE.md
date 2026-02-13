# 🚀 How to Use Your Adaptive Streaming System

## ✅ Current Status
Your server is **RUNNING** on http://localhost:3000

## 🎯 Quick Access

### **Option 1: Interactive Dashboard (Best Experience)**
Open your web browser and go to:
```
http://localhost:3000
```

**What You'll See:**
- 📊 **Real-time Throughput Chart** - Live visualization of data flow
- 🎛️ **Stream Controls** - Start/stop data and log streams
- 📈 **Live Metrics** - Throughput, progress, chunks, backpressure events
- 💻 **Terminal Output** - Real-time stream logs

**Available Actions:**
1. **Stream JSON Data** - Click "Stream Data" button (adjustable dataset size: 100-10000 docs)
2. **Stream Logs** - Click "Stream Logs" button for real-time log streaming
3. **Stop Stream** - Click "Stop" to cancel active streams
4. **Monitor** - Watch adaptive buffering adjust in real-time!

---

## 📡 API Endpoints (For Testing)

### Health Check
```powershell
curl.exe http://localhost:3000/health
```

### Stream Large Dataset
```powershell
curl.exe http://localhost:3000/api/stream/large-dataset?count=1000 -o output.json
```

### Stream Logs
```powershell
curl.exe http://localhost:3000/api/stream/logs
```

### Stream File
```powershell
curl.exe http://localhost:3000/api/stream/file/large-file.bin -o test.bin
```

### System Statistics
```powershell
curl.exe http://localhost:3000/admin/buffer-stats
```

---

## 🧪 Testing Adaptive Buffering

### Test 1: Fast Client (Buffer Shrinks)
```powershell
# Download quickly - watch buffer decrease for lower latency
curl.exe http://localhost:3000/api/stream/large-dataset?count=5000 -o fast-test.json
```

**Expected Console Output:**
```
[AdaptiveBuffer] decreasing: 65536 -> 52428 bytes (avg response: 15ms)
```

### Test 2: Slow Client (Buffer Grows)
```powershell
# Simulate slow client - watch buffer increase for efficiency
curl.exe --limit-rate 10K http://localhost:3000/api/stream/file/large-file.bin -o slow-test.bin
```

**Expected Console Output:**
```
[AdaptiveBuffer] increasing: 65536 -> 98304 bytes (avg response: 125ms)
```

### Test 3: Backpressure Handling
```powershell
# Generate backpressure events
curl.exe http://localhost:3000/api/stream/large-dataset?count=100000
```

**Watch For:**
```
[Backpressure] Pausing log generation
[Backpressure] Resuming log generation
```

---

## 🎮 Interactive Dashboard Features

### Real-Time Visualization
- **Throughput Chart**: Updates every 100ms showing MB/s or KB/s
- **Metrics Panel**: 
  - Current throughput (auto-switches between KB/s and MB/s)
  - Progress percentage
  - Total chunks processed
  - Backpressure events count

### Stream Controls
- **Dataset Size Slider**: Adjust from 100 to 10,000 documents
- **Stream Data Button**: Start JSON data streaming
- **Stream Logs Button**: Start log streaming
- **Stop Button**: Cancel active stream

### Terminal Output
- Color-coded log messages
- Timestamps for each event
- Auto-scrolling to latest output
- Shows system events, data samples, and errors

---

## 📊 What to Watch For

### In the Browser Dashboard:
1. **Throughput spikes** when stream starts
2. **Chart updates** in real-time
3. **Progress percentage** increasing
4. **Terminal logs** showing data samples

### In the Server Console:
1. **Adaptive buffer adjustments**
   ```
   [AdaptiveBuffer] increasing: 65536 -> 98304 bytes
   [AdaptiveBuffer] decreasing: 98304 -> 78643 bytes
   ```

2. **Backpressure events**
   ```
   [Backpressure] Pausing log generation
   [Backpressure] Resuming log generation
   ```

3. **Stream lifecycle**
   ```
   [Stream] Starting dataset stream: 1000 documents
   [Stream] Completed successfully
   ```

---

## 🛠️ Server Management

### Check if Server is Running
```powershell
curl.exe http://localhost:3000/health
```

### Stop the Server
Press `Ctrl+C` in the terminal where `demo-server.js` is running

### Restart the Server
```powershell
node demo-server.js
```

### Use Different Port
```powershell
$env:PORT=3001
node demo-server.js
```

---

## 📚 Next Steps

1. ✅ **Open http://localhost:3000** in your browser
2. 🎮 **Click "Stream Data"** to see adaptive buffering in action
3. 📊 **Watch the chart** update in real-time
4. 🔍 **Monitor server console** for buffer adjustments
5. 🧪 **Try different dataset sizes** (100 to 10,000)
6. 📖 **Read QUICKSTART.md** for more advanced scenarios
7. 🎓 **Explore the code** starting with `demo-server.js`

---

## 🎯 Key Learning Points

### Adaptive Buffering
- Buffer size adjusts based on client speed (16KB - 1MB range)
- Fast clients → smaller buffers → lower latency
- Slow clients → larger buffers → fewer system calls

### Backpressure Management
- Automatic pause/resume when client can't keep up
- Prevents memory overflow
- Visible in both dashboard and console

### Real-Time Monitoring
- Live throughput visualization
- Instantaneous metrics (updated every 100ms)
- Historical data in chart (last 30 data points)

---

## 🐛 Troubleshooting

### Can't Access Dashboard
- Ensure server is running: `curl.exe http://localhost:3000/health`
- Check if port 3000 is available
- Try different port: `$env:PORT=3001; node demo-server.js`

### No Data in Chart
- Click "Stream Data" or "Stream Logs" button
- Check browser console for errors (F12)
- Verify server console shows stream started

### Server Not Responding
- Restart server: Stop with Ctrl+C, then `node demo-server.js`
- Check for port conflicts: `netstat -ano | findstr :3000`

---

**🎉 Enjoy exploring your Adaptive Streaming System!**

For detailed documentation, see:
- `README.md` - Complete architecture and implementation details
- `QUICKSTART.md` - Comprehensive setup and testing guide
- `STATUS.txt` - Feature overview and quick reference
