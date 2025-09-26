const path = require('path');
const express = require('express');
const morgan = require('morgan');
const edge = require('express-edge');
const routes = require('./routes');
const session = require('express-session');
const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const viewRoutes = require('./routes/view.routes');
const notFound = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

/**
 * Express application setup with common middlewares and /api routes.
 */
const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(edge);
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Sessions for /auth and /api/me
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'skalp_local_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

app.use('/api', routes);
app.use('/auth', authRoutes);
app.use('/', viewRoutes);

// simple requireAuth for /api/me
app.use('/api/me', (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ user: null });
});
app.use('/api/me', meRoutes);

app.use(notFound);
app.use(errorMiddleware);

module.exports = app;

