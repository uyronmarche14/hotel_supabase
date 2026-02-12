/**
 * Admin Dashboard Controller
 * Handles fetching dashboard statistics and data
 */

const { db } = require('../../db');
const { users, rooms, bookings } = require('../../db/schema');
const { count, desc, sql, eq } = require('drizzle-orm');
const AppError = require('../../utils/appError');

/**
 * Get admin dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Get total users count
    // Get total users count
    const [usersCount] = await db.select({ count: count() }).from(users);
    
    // Get total rooms count
    const [roomsCount] = await db.select({ count: count() }).from(rooms);
    
    // Get total bookings count
    const [bookingsCount] = await db.select({ count: count() }).from(bookings);
    
    // Get recent bookings
    const recentBookingsData = await db.select({
      id: bookings.id,
      userId: bookings.userId,
      userName: users.name,
      userEmail: users.email,
      userProfilePic: users.profilePic,
      roomId: bookings.roomId,
      roomTitle: rooms.title,
      roomCategory: rooms.category,
      roomImage: rooms.imageUrl,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      createdAt: bookings.createdAt
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .orderBy(desc(bookings.createdAt))
    .limit(5);

    // Get revenue stats
    const revenueData = await db
      .select({
        totalPrice: bookings.totalPrice,
        createdAt: bookings.createdAt
      })
      .from(bookings)
      .where(sql`${bookings.status} != 'cancelled'`);
    
    const totalRevenue = revenueData.reduce((sum, booking) => sum + (parseFloat(booking.totalPrice) || 0), 0);
    
    // Get monthly revenue for the current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = Array(12).fill(0);
    
    revenueData.forEach(booking => {
      const bookingDate = new Date(booking.createdAt);
      if (bookingDate.getFullYear() === currentYear) {
        const month = bookingDate.getMonth();
        monthlyRevenue[month] += parseFloat(booking.totalPrice) || 0;
      }
    });
    
    // Get booking status counts
    const statusCounts = {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0
    };
    
    const statusData = await db
      .select({ status: bookings.status })
      .from(bookings);
    
    statusData.forEach(booking => {
      if (statusCounts.hasOwnProperty(booking.status)) {
        statusCounts[booking.status]++;
      }
    });
    
    // Get recent users
    const recentUsersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        profilePic: users.profilePic,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);
    
    res.status(200).json({
      success: true,
      dashboard: {
        totalUsers: usersCount?.count || 0,
        totalRooms: roomsCount?.count || 0,
        totalBookings: bookingsCount?.count || 0,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        monthlyRevenue: monthlyRevenue.map(amount => parseFloat(amount.toFixed(2))),
        statusCounts,
        recentBookings: recentBookingsData,
        recentUsers: recentUsersData
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getDashboardStats
};
