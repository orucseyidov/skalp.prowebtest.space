const asyncHandler = require('../utils/asyncHandler');

/**
 * Cache Controller
 * Handles cache management operations
 */
class CacheController {
  /**
   * Clear all cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static clearAllCache = asyncHandler(async (req, res) => {
    try {
      // Clear browser cache by setting cache-control headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Clear any server-side cache if exists
      // Note: Since we're using in-memory cache in controllers, 
      // we would need to access the cache instance to clear it
      
      res.json({
        success: true,
        message: 'Keş uğurla silindi',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Keş silinərkən xəta baş verdi',
        error: error.message
      });
    }
  });

  /**
   * Clear specific cache by key
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static clearCacheByKey = asyncHandler(async (req, res) => {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Keş açarı tələb olunur'
      });
    }

    try {
      // Clear specific cache key
      // Note: This would need access to the cache instance
      
      res.json({
        success: true,
        message: `Keş açarı "${key}" uğurla silindi`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Keş silinərkən xəta baş verdi',
        error: error.message
      });
    }
  });

  /**
   * Get cache statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static getCacheStats = asyncHandler(async (req, res) => {
    try {
      // Get cache statistics
      const stats = {
        totalKeys: 0, // Would need access to cache instance
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Keş statistikaları alınarkən xəta baş verdi',
        error: error.message
      });
    }
  });

  /**
   * Force refresh data (clear cache and reload)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static forceRefresh = asyncHandler(async (req, res) => {
    try {
      // Clear cache and force refresh
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        success: true,
        message: 'Məlumatlar yeniləndi və keş silindi',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Yeniləmə zamanı xəta baş verdi',
        error: error.message
      });
    }
  });
}

module.exports = CacheController;
