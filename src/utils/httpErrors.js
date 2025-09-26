function createHttpError(status, message, meta) {
  const err = new Error(message);
  err.status = status;
  if (meta) err.meta = meta;
  return err;
}

module.exports = { createHttpError };

