import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from 'dotenv';
import { createServer } from 'http';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ExtensionWebSocketServer } from './services/websocketServer';
import logger from './utils/logger';

// Load environment variables  
config();

// Force Railway redeploy - July 15, 2025 - WebSocket fix

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disable for now to simplify deployment
}));

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      'https://codesight-crowdsource-collector.vercel.app',
      'https://codesight-crowdsource-collector-*.vercel.app'
    ].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed || typeof allowed !== 'string') return false;
      if (origin === allowed) return true;
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(compression());
app.use(morgan('combined'));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection will be tested when routes are accessed

// Import routes with individual error handling
console.log('🔍 Starting route imports... [FORCED REDEPLOY]');

let workersRouter: any;
try {
  const workersModule = require('./routes/workers');
  workersRouter = workersModule.default || workersModule;
  console.log('✅ Workers router imported:', !!workersRouter);
} catch (error) {
  console.error('❌ Workers router failed:', error instanceof Error ? error.message : String(error));
}

let sessionsRouter: any;
try {
  const sessionsModule = require('./routes/sessions');
  sessionsRouter = sessionsModule.default || sessionsModule;
  console.log('✅ Sessions router imported:', !!sessionsRouter);
} catch (error) {
  console.error('❌ Sessions router failed:', error instanceof Error ? error.message : String(error));
}

let uploadRouter: any;
try {
  const uploadModule = require('./routes/upload');
  uploadRouter = uploadModule.default || uploadModule;
  console.log('✅ Upload router imported:', !!uploadRouter);
} catch (error) {
  console.error('❌ Upload router failed:', error instanceof Error ? error.message : String(error));
}

let transcriptionRouter: any;
try {
  const transcriptionModule = require('./routes/transcription');
  transcriptionRouter = transcriptionModule.default || transcriptionModule;
  console.log('✅ Transcription router imported:', !!transcriptionRouter);
} catch (error) {
  console.error('❌ Transcription router failed:', error instanceof Error ? error.message : String(error));
}

let extensionRouter: any;
try {
  const extensionModule = require('./routes/extension');
  extensionRouter = extensionModule.default || extensionModule;
  console.log('✅ Extension router imported:', !!extensionRouter);
} catch (error) {
  console.error('❌ Extension router failed:', error instanceof Error ? error.message : String(error));
}

console.log('📦 Route import phase completed');

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'API healthy - v2.3 [EXTENSION ROUTES]' });
});

// Migration endpoint  
app.post('/api/migrate', async (_req, res) => {
  try {
    const { runMigrations } = await import('./utils/migrate');
    const result = await runMigrations();
    res.json(result);
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ success: false, error: 'Migration failed', details: error });
  }
});

// Quick check endpoint
app.get('/api/debug/counts', async (_req, res) => {
  try {
    const pool = (await import('./database')).default;
    const workers = await pool.query('SELECT COUNT(*) FROM workers');
    const sessions = await pool.query('SELECT COUNT(*) FROM sessions');
    res.json({ 
      workers: workers.rows[0].count, 
      sessions: sessions.rows[0].count 
    });
  } catch (error) {
    res.json({ error: String(error) });
  }
});

// Migration endpoint
app.post('/api/migrate', async (_req, res) => {
  try {
    const { runMigrations } = await import('./utils/migrate');
    const result = await runMigrations();
    res.json(result);
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', details: error });
  }
});

// Admin endpoint to check recent activity
app.get('/api/admin/recent', async (_req, res) => {
  try {
    const pool = (await import('./database')).default;
    
    const workers = await pool.query(
      'SELECT worker_id, email, worker_data, status, created_at FROM workers ORDER BY created_at DESC LIMIT 10'
    );
    
    const sessions = await pool.query(
      'SELECT id, worker_id, session_data, video_url, audio_url, status, created_at FROM sessions ORDER BY created_at DESC LIMIT 10'
    );
    
    res.json({
      success: true,
      data: {
        recentWorkers: workers.rows,
        recentSessions: sessions.rows,
        counts: {
          totalWorkers: workers.rowCount,
          totalSessions: sessions.rowCount
        }
      }
    });
  } catch (error) {
    console.error('Admin query error:', error);
    res.status(500).json({ error: 'Failed to get admin data', details: error });
  }
});

// Register routes with safety checks
console.log('🔍 Starting route registration...');

if (workersRouter) {
  app.use('/api/workers', workersRouter);
  console.log('✅ Workers routes registered');
} else {
  console.log('❌ Workers routes skipped - router not loaded');
}

if (sessionsRouter) {
  app.use('/api/sessions', sessionsRouter);
  console.log('✅ Sessions routes registered');
} else {
  console.log('❌ Sessions routes skipped - router not loaded');
}

if (uploadRouter) {
  app.use('/api/upload', uploadRouter);
  console.log('✅ Upload routes registered');
} else {
  console.log('❌ Upload routes skipped - router not loaded');
}

if (transcriptionRouter) {
  app.use('/api/transcription', transcriptionRouter);
  console.log('✅ Transcription routes registered');
} else {
  console.log('❌ Transcription routes skipped - router not loaded');
}

if (extensionRouter) {
  app.use('/api/extension', extensionRouter);
  console.log('✅ Extension routes registered');
} else {
  console.log('❌ Extension routes skipped - router not loaded');
}

console.log('🚀 Route registration phase completed');

// 404 handler
app.use('*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Create HTTP server and WebSocket server
const server = createServer(app);

try {
  new ExtensionWebSocketServer(server);
  console.log('✅ Extension WebSocket server initialized');
} catch (error) {
  console.error('❌ Failed to initialize WebSocket server:', error);
}

// Start server
server.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthEndpoint: `http://localhost:${PORT}/health`,
    websocketEndpoint: `ws://localhost:${PORT}/extension-ws`,
  });
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Extension WebSocket: ws://localhost:${PORT}/extension-ws`);
});

export default app;