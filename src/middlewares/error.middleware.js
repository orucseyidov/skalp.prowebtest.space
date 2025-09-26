// eslint-disable-next-line no-unused-vars
module.exports = (err, _req, res, _next) => {
  const status = err.status || err.code || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal Server Error',
    code: status,
  };
  if (err.meta) payload.details = err.meta;
  res.status(status).json(payload);
};


