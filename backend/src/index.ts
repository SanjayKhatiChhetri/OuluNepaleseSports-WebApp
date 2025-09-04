import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { generalRateLimit, speedLimiter } from './middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security and rate limiting middleware
app.use(helmet());

// Configure CORS for frontend-backend communication
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000',
  ],
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};

app.use(cors(corsOptions));
app.use(morgan('combined'));

// Apply general rate limiting to all requests
app.use(generalRateLimit);

// Apply speed limiting to slow down repeated requests
app.use(speedLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Import routes
import testRoutes from './routes/test';
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import eventRoutes from './routes/event';

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'ONS WebApp API',
    version: '1.0.0',
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Content management routes
app.use('/api/content', contentRoutes);

// Event management routes
app.use('/api/events', eventRoutes);

// Test routes for validation and rate limiting
app.use('/api/test', testRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong!',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  // Test database connection
  const { testDatabaseConnection } = await import('./lib/database');
  const isConnected = await testDatabaseConnection();
  if (isConnected) {
    console.log('✅ Database connected successfully');
  } else {
    console.error('❌ Database connection failed');
  }
});

export default app;