# ProStream - Production-Ready Video Streaming Platform

A full-stack video streaming platform similar to Netflix or YouTube, built with Node.js, Express, MongoDB, and Modern Vanilla JS.

## 🚀 Features

- **Public Home Page**: Anyone can watch videos without logging in.
- **Admin Panel**: Secure dashboard to upload, delete, and manage videos.
- **User Authentication**: Email/Password + Google OAuth login.
- **Personalization**: Watch history, Liked videos, and Recently watched sections.
- **Micro-services Architecture**: Dedicated routes for auth and video streaming.
- **Efficient Streaming**: Node.js chunked streaming (no RAM overloading).
- **Responsive Design**: Modern Netflix-style dark theme for all devices.

## 🛠 Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, Passport.js (Google OAuth)
- **Storage**: Local filesystem (Scalable to AWS S3/Cloudinary)
- **Frontend**: HTML5, CSS3, Modern JavaScript (ES6+)

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/pro_streaming_db
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_id
   GOOGLE_CLIENT_SECRET=your_google_secret
   ```
4. Initialize the Admin user:
   ```bash
   npm run init-admin
   ```
   *Note: Default credentials are (admin / adminPassword123)*

## 🏃 Run Locally

```bash
npm run dev
```
Visit `http://localhost:3000`

## 📂 Project Structure

- `backend/`: Server logic, models, controllers, and routes.
- `frontend/`: Client-side UI and logic.
- `uploads/`: Directory where video files and thumbnails are stored.
- `scripts/`: Initialization and maintenance scripts.

## 🚢 Deployment

### Vercel / Render
1. Connect your GitHub repository.
2. Add your environment variables in the dashboard.
3. Build command: (leave empty if Node.js)
4. Start command: `npm start`
5. Ensure MongoDB Atlas URL is provided.

---
Created for [Nishant19Yadav/Streaming-Response-Handler]
