const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
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
const imageRoutes = require('./routes/image.routes');
const cloudinaryRoutes = require('./routes/cloudinary.routes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

// CORS must be configured BEFORE any other middleware
const corsOptions = {
  origin: function(origin, callback) {
    console.log('Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps, curl, etc)
    if(!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://solace-hotel.netlify.app',
      'https://api.cloudinary.com',
      'https://hotel-supabase.onrender.com'
    ];
    
    // Add CORS_ORIGIN to allowed origins if set
    if (process.env.CORS_ORIGIN && !allowedOrigins.includes(process.env.CORS_ORIGIN)) {
      allowedOrigins.push(process.env.CORS_ORIGIN);
    }
    
    console.log('Allowed origins:', allowedOrigins);
    
    // Check if the origin is in our allowedOrigins
    if(allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin']
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Other middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Apply token refresh middleware to all routes
app.use(refreshTokenIfNeeded);

// API routes
app.use('/api/auth', authRoutes);

// Use a single router for both /api/hotels and /api/rooms paths
// This approach reduces memory usage while maintaining backward compatibility
const combinedRouter = express.Router();
combinedRouter.use('/', hotelRoutes);
app.use('/api/hotels', combinedRouter);
app.use('/api/rooms', combinedRouter);

app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes); // Admin-specific auth routes
app.use('/api/images', imageRoutes); // Cloudinary and image management routes
app.use('/api/cloudinary', cloudinaryRoutes); // Direct Cloudinary upload routes

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
