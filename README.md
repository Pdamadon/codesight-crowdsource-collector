# CodeSight Crowdsource Collector

> **📍 Good Starting Point** - This commit represents a stable, working system with audio-only recording, production WebSocket connectivity, and functional browser extension. All core features are operational and ready for enhancement.

## 🎯 Overview

A comprehensive platform for collecting high-quality shopping behavior data to train AI agents for e-commerce automation. The system combines screen/audio recording with precise click tracking via browser extension to generate training data for AI models using Playwright automation.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │ Browser Extension│    │     Backend     │
│   (React/TS)    │    │   (Chrome Ext)   │    │   (Node.js/TS)  │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Video/Audio │ │    │ │ Click Tracker│ │    │ │  WebSocket  │ │
│ │ Recording   │ │    │ │ CSS Selectors│ │    │ │   Server    │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Session     │ │◄──►│ │ Real-time    │ │◄──►│ │ PostgreSQL  │ │
│ │ Management  │ │    │ │ Data Stream  │ │    │ │  Database   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ S3 Upload   │ │    │ │ Activity Log │ │    │ │ REST API    │ │
│ │ Integration │ │    │ │ & Download   │ │    │ │ Endpoints   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────────────┐
                    │     External Services    │
                    │                         │
                    │ ┌─────────────────────┐ │
                    │ │     AWS S3          │ │
                    │ │   File Storage      │ │
                    │ └─────────────────────┘ │
                    │ ┌─────────────────────┐ │
                    │ │    Railway.app      │ │
                    │ │  Cloud Hosting      │ │
                    │ └─────────────────────┘ │
                    │ ┌─────────────────────┐ │
                    │ │     Vercel         │ │
                    │ │  Frontend Deploy   │ │
                    │ └─────────────────────┘ │
                    └─────────────────────────┘
```

## ✨ Key Features

### 🎥 **Comprehensive Data Collection**
- **Screen Recording**: Captures full shopping sessions with WebM video
- **Audio Narration**: Records user thought process during shopping
- **Precise Click Tracking**: CSS selectors, coordinates, and element data
- **Cross-page Persistence**: Maintains tracking across navigation
- **Form Input Monitoring**: Captures interactions with privacy protection

### 🛡️ **Security & Privacy**
- **Data Sanitization**: Automatically removes passwords, emails, payment info
- **Input Validation**: Prevents SQL injection and malformed data
- **Secure WebSocket**: WSS encryption for production deployment
- **Privacy-first Design**: Anonymizes sensitive user data

### 🚀 **Production Ready**
- **Cloud Deployment**: Railway backend + Vercel frontend
- **Real-time Processing**: WebSocket streaming for immediate data capture
- **Scalable Architecture**: Supports multiple concurrent workers
- **Download Integration**: Automatic JSON export for training data

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **MediaRecorder API** for screen/audio capture
- **WebRTC** for browser recording

### Backend
- **Node.js** with TypeScript
- **Express.js** web framework
- **WebSocket (ws)** for real-time communication
- **PostgreSQL** database
- **AWS S3** for file storage
- **Railway** for cloud hosting

### Browser Extension
- **Manifest V3** Chrome extension
- **Content Script** injection for click tracking
- **Background Service Worker** for WebSocket management
- **Real-time Event Streaming** to backend

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- AWS S3 bucket
- Chrome browser (for extension)

### 1. Backend Setup

```bash
cd backend
npm install

# Environment variables
cp .env.example .env
# Configure: DATABASE_URL, AWS credentials, etc.

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Environment variables
cp .env.example .env
# Configure: VITE_API_URL, etc.

# Start development server
npm run dev
```

### 3. Browser Extension Setup

```bash
# Load extension in Chrome
1. Go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the /browser-extension folder
5. Pin the extension to toolbar
```

## 🎯 Usage Workflow

### For Data Collection Workers

1. **Install Extension**
   - Load extension in Chrome developer mode
   - Pin CodeSight extension to toolbar

2. **Connect to Backend**
   - Click extension icon
   - Enter WebSocket URL: `wss://your-backend.railway.app/extension-ws`
   - Click "Connect to CodeSight"

3. **Start Session**
   - Enter session ID (auto-generated)
   - Click "Start Tracking"
   - Begin shopping session

4. **Shop Naturally**
   - Navigate to shopping websites
   - Click products, read reviews, compare prices
   - Narrate thoughts out loud
   - Extension captures all interactions

5. **Complete Session**
   - Click "Stop Tracking"
   - Automatic JSON download with interaction data
   - Session data stored in database

### For Administrators

1. **Monitor Sessions**
   ```bash
   GET /api/extension/sessions
   ```

2. **Download Training Data**
   ```bash
   GET /api/extension/sessions/{sessionId}/training-data
   ```

3. **View Analytics**
   ```bash
   GET /api/admin/recent
   ```

## 📊 Data Structure

### Extension Session Data
```json
{
  "sessionId": "cs_md0ap0gn_thwyx",
  "startTime": "2025-07-12T13:30:00.000Z",
  "endTime": "2025-07-12T13:45:00.000Z",
  "duration": 900000,
  "totalEvents": 47,
  "events": [
    {
      "type": "click",
      "data": {
        "selector": "#add-to-cart-button",
        "element": "button",
        "text": "Add to Cart",
        "coordinates": { "x": 450, "y": 200 },
        "url": "https://amazon.com/product/...",
        "timestamp": 1641985800000
      }
    }
  ],
  "summary": {
    "clicks": 23,
    "inputs": 8,
    "scrolls": 12,
    "navigations": 4,
    "pagesVisited": ["amazon.com", "ebay.com"]
  }
}
```

### Training Data Format
```json
{
  "video_path": "s3://bucket/session-video.webm",
  "audio_path": "s3://bucket/session-audio.webm",
  "annotations": [
    {
      "timestamp": 1641985800000,
      "action_type": "click",
      "target_selector": "#add-to-cart-button",
      "coordinates": [450, 200],
      "element_text": "Add to Cart",
      "page_url": "https://amazon.com/product/..."
    }
  ]
}
```

## 🔧 API Endpoints

### Extension Data Collection
- `WebSocket /extension-ws` - Real-time event streaming
- `GET /api/extension/sessions` - List all sessions
- `GET /api/extension/sessions/{id}/data` - Get session events
- `GET /api/extension/sessions/{id}/training-data` - Training format

### Session Management
- `POST /api/workers` - Register worker
- `POST /api/sessions` - Create session record
- `GET /api/sessions` - List sessions

### File Upload
- `POST /api/upload/url` - Get S3 upload URL
- `POST /api/upload/complete` - Mark upload complete

## 🚀 Deployment

### Backend (Railway)
```bash
# Connect to Railway
railway login
railway link

# Deploy
git push origin main
# Railway auto-deploys from GitHub
```

### Frontend (Vercel)
```bash
# Connect to Vercel
vercel login
vercel link

# Deploy
vercel --prod
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=codesight-recordings
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app/extension-ws
```

## 🛡️ Security Features

- **Parameterized Queries**: Prevents SQL injection
- **Input Validation**: Type checking and sanitization
- **Session ID Sanitization**: Alphanumeric-only validation
- **Event Type Whitelisting**: Only allowed event types
- **CORS Configuration**: Restricted origins
- **Data Privacy**: Automatic sensitive data masking

## 📈 Performance

- **Real-time Processing**: WebSocket streaming < 10ms latency
- **Efficient Storage**: Events batched and compressed
- **Memory Management**: Automatic cleanup of stale sessions
- **Throttled Capture**: Optimized event frequency (scroll: 200ms, hover: 1s)

## 🔍 Monitoring

### Health Checks
```bash
# Backend health
GET /health

# API health
GET /api/health

# Database connectivity
GET /api/debug/counts
```

### Logging
- Structured logging with timestamps
- WebSocket connection tracking
- Error monitoring and alerting
- Session completion metrics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Development Channel](https://discord.gg/your-channel)

## 🎯 Use Cases

### AI Training Data
- **E-commerce Automation**: Train AI agents for shopping tasks
- **UX Research**: Analyze user behavior patterns
- **A/B Testing**: Compare interface effectiveness
- **Conversion Optimization**: Identify friction points

### Research Applications
- **Academic Studies**: Shopping behavior analysis
- **Market Research**: Consumer decision patterns
- **Accessibility Studies**: Interface usability testing
- **Cross-platform Analysis**: Multi-site shopping flows

---

**Built with ❤️ for the AI community**

Generate high-quality training data for the next generation of intelligent shopping assistants.