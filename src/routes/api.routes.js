const express = require('express');
const binanceController = require('../controllers/binance.controller');
const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Binance API routes (public)
router.get('/symbols', binanceController.getSymbols);
router.get('/klines', binanceController.getKlines);
router.get('/scalp30s', binanceController.getScalp30s);
router.get('/deepseek', binanceController.getDeepSeekAnalysis);

// Profile API routes (protected)
router.get('/me/profile', requireAuth, profileController.getProfile);
router.post('/me/profile', requireAuth, profileController.updateProfile);
router.get('/me/settings', requireAuth, profileController.getSettings);
router.post('/me/settings', requireAuth, profileController.updateSettings);
router.post('/me/password', requireAuth, profileController.changePassword);

module.exports = router;
