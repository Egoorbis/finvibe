import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables first
dotenv.config();

// Import monitoring (must be before other imports for proper instrumentation)
import { initializeMonitoring } from './services/monitoring.js';

// Initialize monitoring early
initializeMonitoring();

// Import security middleware
import { securityHeaders, additionalSecurity } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import sanitizeInput from './middleware/sanitize.js';

// Import email service
import { verifyEmailConfig } from './services/emailService.js';

// Import routes
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import reportRoutes from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Security Middleware (apply first)
app.use(securityHeaders);
app.use(additionalSecurity);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FinVibe API is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to FinVibe API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      accounts: '/api/accounts',
      categories: '/api/categories',
      transactions: '/api/transactions',
      budgets: '/api/budgets',
      reports: '/api/reports'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong!'
    : err.message;

  res.status(err.status || 500).json({
    error: message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, HOST, async () => {
  const baseUrl = `http://${HOST}:${PORT}`;
  console.log(`🚀 FinVibe API server is running on ${baseUrl}`);
  console.log(`📊 API Documentation: ${baseUrl}/`);
  console.log(`💚 Health check: ${baseUrl}/health`);
  console.log(`🔒 Security: Helmet, Rate Limiting, Input Sanitization enabled`);

  // Verify email service configuration
  await verifyEmailConfig();
});

export default app;
