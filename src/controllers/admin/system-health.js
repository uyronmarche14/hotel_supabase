/**
 * Admin System Health Controller
 * Handles system health monitoring and status checks
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get system health status
 */
const getSystemHealth = async (req, res, next) => {
  try {
    // Check database connection
    const startTime = Date.now();
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
    
    const dbResponseTime = Date.now() - startTime;
    const dbStatus = error ? 'error' : 'healthy';
    
    // Get server info
    const serverInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    res.status(200).json({
      success: true,
      health: {
        status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`
        },
        server: serverInfo,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getSystemHealth
};
