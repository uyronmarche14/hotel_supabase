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

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
// Configure CORS with more permissive options for development
app.use(cors({
  origin: process.env.CORS_ORIGIN ? 
    [process.env.CORS_ORIGIN,'https://hotel-supabase.onrender.com', 'https://api.cloudinary.com'] : 
    ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://api.cloudinary.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

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
