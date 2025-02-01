import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routers properly
import leetcodeRouter from './api/leetcode';
import codechefRouter from './api/codechef';
import hackerrankRouter from './api/hackerrank';

// Load environment variables
dotenv.config();

const app = express();

// Middleware configuration
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

// CORS configuration with more permissive settings for development
const corsOptions = {
  origin: [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://localhost:5001',
    'http://127.0.0.1:5001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Security headers configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// API routes
app.use('/api/leetcode', leetcodeRouter);
app.use('/api/codechef', codechefRouter);
app.use('/api/hackerrank', hackerrankRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Port configuration
const PORT = parseInt(process.env.PORT || '5001', 10);
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

export default app;