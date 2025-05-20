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
const debugRoutes = require('./routes/debug.routes'); // Import debug routes

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
// Configure CORS with more permissive options for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
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

// Add debug routes for troubleshooting
app.use('/api/debug', debugRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes); // Admin-specific auth routes
app.use('/api/images', imageRoutes); // Cloudinary and image management routes

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
