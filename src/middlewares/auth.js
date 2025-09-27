/**
 * Authentication middleware
 * Checks if user is authenticated and adds user info to request
 */

/**
 * Require authentication for protected routes
 * Redirects to login page if not authenticated
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    // Add user info to request for easy access
    req.user = req.session.user;
    return next();
  }
  
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Giriş tələb olunur'
    });
  }
  
  // For web requests, redirect to login
  return res.redirect('/login');
}

/**
 * Optional authentication middleware
 * Adds user info if authenticated, but doesn't require it
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  return next();
}

/**
 * Require specific user role (for future use)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Giriş tələb olunur'
      });
    }
    
    // For now, all users have the same role
    // In the future, you can add role checking here
    if (req.session.user.role && req.session.user.role !== role) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Yetkiniz çatmır'
      });
    }
    
    req.user = req.session.user;
    return next();
  };
}

/**
 * Check if user is admin (for future use)
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin
};
