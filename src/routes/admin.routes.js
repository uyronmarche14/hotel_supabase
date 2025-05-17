const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const bookingController = require('../controllers/booking.controller');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminBookingRoutes = require('./admin.booking.routes');
const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');

// All admin routes are protected by both auth and admin middleware
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// Use admin sub-routes
router.use('/bookings', adminBookingRoutes);

// Import admin room routes
const adminRoomRoutes = require('./admin.room.routes');
router.use('/rooms', adminRoomRoutes);

// Dashboard stats with enhanced data for admin
router.get('/dashboard', adminController.getDashboardStats);

// System health status
router.get('/system-health', adminController.getSystemHealth);

// User management routes
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
