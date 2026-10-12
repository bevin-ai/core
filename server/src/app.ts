import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth/auth.routes';
import webhookRoutes from './routes/webhook/routes';
import sessionRoutes from './routes/sessions/sessions.routes';
import chatRoutes from './routes/chat/chat.routes';
import githubRoutes from './routes/github/github.routes'; 

const app: Application = express();

// Heroku router terminates TLS; needed for secure cookies behind the proxy
app.set('trust proxy', 1);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration with credentials support for cookies
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid CORS blocking
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Cookie parser for reading session/auth cookies
app.use(cookieParser());


// Authentication routes
app.use('/auth', authRoutes);

// Existing API routes
app.use('/api', webhookRoutes);

// JSON and URL-encoded body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management (authenticated)
app.use('/api/sessions', sessionRoutes);

// Chat (authenticated, proxies to CrewAI chat service)
app.use('/api/chat', chatRoutes);

app.use('/api/github', githubRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built client (same-origin in production)
const clientDist = path.resolve(process.env.CLIENT_DIST || '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for client routes (Express 5-safe: middleware instead of '*')
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
