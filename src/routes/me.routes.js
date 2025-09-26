const express = require('express');
const controller = require('../controllers/me.controller');

const router = express.Router();

// require auth helper for CJS app will be inlined in app.js via middleware chain
router.get('/profile', controller.getProfile);
router.post('/profile', controller.saveProfile);
router.get('/settings', controller.getSettings);
router.post('/settings', controller.saveSettings);
router.post('/password', controller.changePassword);

module.exports = router;

