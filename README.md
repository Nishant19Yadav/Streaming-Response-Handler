# ProStream | Next-Gen Video Streaming Platform

A production-ready streaming platform backend built with Node.js, Express, and MongoDB. This project focuses on high-efficiency data delivery using Node.js Streams, Adaptive Buffering, and Backpressure management.

## 🚀 Key Features

- **Efficient Streaming**: Streams large video files in chunks using `fs.createReadStream` and `pipeline()`, ensuring zero memory overflow even for multi-gigabyte files.
- **Adaptive Buffering**: A custom `AdaptiveBuffer` transform stream that monitors client response times and dynamically adjusts the internal buffer size (32KB to 2MB).
- **MongoDB Integration**: Stores video metadata and leverages MongoDB cursor streaming for scalable data access.
- **Backpressure Handling**: Uses the Node.js `pipeline` API to automatically pause/resume data flow based on client bandwidth, preventing server crashes.
- **Video Seek Support**: Implements HTTP Range requests (status 206) allowing users to jump to any part of the video instantly.
- **On-the-fly Compression**: Supports Gzip compression for streams to reduce bandwidth consumption.
- **Modern UI**: A premium glassmorphism frontend built with Vanilla JS, CSS, and HTML.

## 📁 Project Structure

```text
├── backend/
│   ├── controllers/    # Request handlers (Upload, Stream, Delete)
│   ├── models/         # Mongoose schemas (Video metadata)
│   ├── routes/         # Express API routes
│   ├── streams/        # Custom stream logic (AdaptiveBuffer, Compression)
│   └── index.js        # Main entry point
├── frontend/           # Premium Glassmorphism UI
├── uploads/            # Local storage for video files
├── package.json        # Dependencies and scripts
└── README.md
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Streams**: Node.js Streams API (Readable, Writable, Transform)
- **File Handling**: Multer (for uploads)

## 🚦 How it Works

### 1. Streaming vs. Buffering
Unlike standard file serving, this platform never loads the entire file into RAM. It reads the file piece-by-piece from the disk and pushes it directly to the socket as soon as the client is ready to receive it.

### 2. Backpressure
When a client has slow internet, the network socket's internal buffer fills up. Node.js detects this and "pauses" the file reading process. Once the client clears some data, Node.js "resumes" reading. This keeps memory usage constant (usually < 50MB) regardless of file size.

### 3. Adaptive Buffering Logic
1. **Initial**: Starts at 128KB.
2. **Analysis**: Tracks time taken to push each chunk.
3. **Growth**: If the client is consistently slow (>150ms), it increases buffer size to reduce the frequency of system calls.
4. **Shrink**: If the client is very fast (<30ms), it shrinks buffer size to minimize latency.

## 🏁 Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Ensure MongoDB is Running**:
   Default connection: `mongodb://localhost:27017/pro_streaming_db`

3. **Start the Platform**:
   ```bash
   npm start
   ```

4. **Access UI**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 API Documentation

- `POST /api/videos/upload`: Upload a video file (form-data: title, video).
- `GET /api/videos`: List all available videos.
- `GET /api/videos/stream/:id`: Stream video data (supports range).
- `DELETE /api/videos/:id`: Delete a video and its file.

---
Built as a high-performance demonstration of Node.js Streams.
