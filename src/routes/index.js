const express = require('express');
const userRoutes = require('./user.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/users', userRoutes);

module.exports = router;

