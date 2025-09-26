const { createHttpError } = require('../utils/httpErrors');

/**
 * Generic Joi validator middleware.
 * @param {import('joi').Schema} schema
 * @param {('body'|'params'|'query')} [property='body']
 */
module.exports = (schema, property = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
  if (error) return next(createHttpError(400, 'Validation error', { details: error.details }));
  req[property] = value;
  return next();
};


