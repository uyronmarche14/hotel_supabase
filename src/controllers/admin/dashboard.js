/**
 * Admin Dashboard Controller
 * Handles fetching dashboard statistics and data
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get admin dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      return next(new AppError(usersError.message, 500));
    }
    
    // Get total rooms count
    const { count: totalRooms, error: roomsError } = await supabaseClient
      .from('rooms')
      .select('*', { count: 'exact', head: true });
    
    if (roomsError) {
      return next(new AppError(roomsError.message, 500));
    }
    
    // Get total bookings count
    const { count: totalBookings, error: bookingsCountError } = await supabaseClient
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    
    if (bookingsCountError) {
      return next(new AppError(bookingsCountError.message, 500));
    }
    
    // Get recent bookings
    const { data: recentBookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        room_id,
        check_in,
        check_out,
        total_price,
        status,
        created_at,
        rooms:room_id (title, category, image_url),
        users:user_id (name, email, profile_pic)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (bookingsError) {
      return next(new AppError(bookingsError.message, 500));
    }
    
    // Transform recent bookings for frontend compatibility
    const formattedRecentBookings = recentBookings.map(booking => ({
      id: booking.id,
      userId: booking.user_id,
      userName: booking.users?.name || 'Unknown',
      userEmail: booking.users?.email || 'Unknown',
      userProfilePic: booking.users?.profile_pic || null,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || 'Unknown',
      roomCategory: booking.rooms?.category || 'Unknown',
      roomImage: booking.rooms?.image_url || null,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      status: booking.status,
      createdAt: booking.created_at
    }));
    
    // Get revenue stats
    const { data: bookings, error: revenueError } = await supabaseClient
      .from('bookings')
      .select('total_price, status, created_at')
      .not('status', 'eq', 'cancelled');
    
    if (revenueError) {
      return next(new AppError(revenueError.message, 500));
    }
    
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    
    // Get monthly revenue for the current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = Array(12).fill(0);
    
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      if (bookingDate.getFullYear() === currentYear) {
        const month = bookingDate.getMonth();
        monthlyRevenue[month] += booking.total_price || 0;
      }
    });
    
    // Get booking status counts
    const statusCounts = {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0
    };
    
    const { data: statusData, error: statusError } = await supabaseClient
      .from('bookings')
      .select('status');
    
    if (!statusError && statusData) {
      statusData.forEach(booking => {
        if (statusCounts.hasOwnProperty(booking.status)) {
          statusCounts[booking.status]++;
        }
      });
    }
    
    // Get recent users
    const { data: recentUsers, error: recentUsersError } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentUsersError) {
      return next(new AppError(recentUsersError.message, 500));
    }
    
    // Transform recent users for frontend compatibility
    const formattedRecentUsers = recentUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profile_pic,
      createdAt: user.created_at
    }));
    
    res.status(200).json({
      success: true,
      dashboard: {
        totalUsers: totalUsers || 0,
        totalRooms: totalRooms || 0,
        totalBookings: totalBookings || 0,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        monthlyRevenue: monthlyRevenue.map(amount => parseFloat(amount.toFixed(2))),
        statusCounts,
        recentBookings: formattedRecentBookings,
        recentUsers: formattedRecentUsers
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getDashboardStats
};
