const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const errorHandler = require('./middleware/errorHandler');
const { refreshTokenIfNeeded } = require('./middleware/auth.middleware');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const hotelRoutes = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/admin.auth.routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

// trust proxy is required for Vercel/proxies to handle rate limiting correctly
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet()); // Security headers
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Performance Middleware
app.use(compression()); // Compress responses

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter); // Apply to API routes

// Logging
app.use(morgan('dev'));

// Configure CORS with specific options for frontend compatibility
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Normalize origins by removing trailing slashes
    const normalize = (url) => url.replace(/\/$/, "");
    const normalizedOrigin = normalize(origin);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:7000',
      process.env.CORS_ORIGIN
    ].filter(Boolean).map(normalize);
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Apply token refresh middleware to all routes
app.use(refreshTokenIfNeeded);

// API routes - matching the old backend structure
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes); // Map to room.routes.js but keep the old path

// Add new route mount point that matches the frontend expected path
app.use('/api/rooms', hotelRoutes); // Duplicate mount point for compatibility with frontend

app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes); // Admin-specific auth routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app; // Export for testing
