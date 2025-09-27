const express = require('express');
const authRoutes = require('./auth.routes');
const apiRoutes = require('./api.routes');
const viewRoutes = require('./view.routes');
const userRoutes = require('./user.routes');
const meRoutes = require('./me.routes');

const router = express.Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes in correct order
router.use('/auth', authRoutes);        // /auth/*
router.use('/api', apiRoutes);          // /api/*
router.use('/users', userRoutes);       // /users/*
router.use('/me', meRoutes);            // /me/*
router.use('/', viewRoutes);            // / (views) - must be last

module.exports = router;

