module.exports = (req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ success: false, message: 'Not Found', code: 404 });
};


