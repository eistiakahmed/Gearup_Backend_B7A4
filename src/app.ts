import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import adminRoutes from './modules/admin/admin.routes';
import authRoutes from './modules/auth/auth.routes';
import gearRoutes from './modules/gear/gear.routes';
import paymentRoutes from './modules/payment/payment.routes';
import providerRoutes from './modules/provider/provider.routes';
import rentalRoutes from './modules/rental/rental.routes';
import reviewRoutes from './modules/review/review.routes';
import { sendError } from './utils/apiResponse.util';
import config from './config/env.config';

// Create Express app
const app: Application = express();

// Trust proxy - important for behind reverse proxy
app.set('trust proxy', 1);

// Dynamic CORS configuration allowing localhost and Vercel deployments
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin.startsWith('http://localhost:');

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow for flexible deployment
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
};
app.use(cors(corsOptions));
// Request logging middleware (all environments)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Body parsing middleware (captures raw body for Stripe webhook signature verification)
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('/webhook/stripe')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Health check endpoint with database connectivity check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const { prisma } = await import('./config/database');
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'GearUp API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(503).json({
      success: false,
      message: 'GearUp API is running but database is disconnected',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Documentation
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/gear', gearRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/admin', adminRoutes);

// Public Category Endpoints
import { getAllCategories } from './modules/gear/gear.controller';
app.get('/api/categories', getAllCategories);
app.get('/api/categories/all', getAllCategories);

// 404 handler - must be after all routes
app.use((req: Request, res: Response) => {
  sendError(res, 404, 'Route not found', `Cannot ${req.method} ${req.path}`);
});

// Global error handler - must be last
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error handler:', err);

  sendError(
    res,
    500,
    'Internal server error',
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
});

export default app;