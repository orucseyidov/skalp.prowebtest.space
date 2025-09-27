const express = require('express');
const path = require('path');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Login page route
router.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

// Direct /index.html access should respect auth
router.get('/index.html', requireAuth, (req, res) => {
  return res.render('pages/home', { title: 'Skalp Ticarət', currentPage: 'home' });
});

// Test page route
router.get('/test', requireAuth, (req, res) => {
  return res.render('pages/test', { title: 'Skalp Test Səhifəsi', currentPage: 'test' });
});

// Root route with auth check
router.get('/', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.sendFile(path.join(__dirname, '../../public', 'login.html'));
  }
  return res.render('pages/home', { title: 'Skalp Ticarət', currentPage: 'home' });
});

// Fallback - must be last
router.get('*', requireAuth, (req, res) => {
  return res.render('pages/home', { title: 'Skalp Ticarət', currentPage: 'home' });
});

module.exports = router;

